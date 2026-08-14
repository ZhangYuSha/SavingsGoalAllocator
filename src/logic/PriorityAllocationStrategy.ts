import type { Goal } from '../types/goal'
import type { MonthlyBudget } from '../types/monthlyBudget'
import type {
  AllocationResult,
  MonthlyAllocation,
  AllocationPlan
} from '../types/Allocation'

import type { AllocationStrategy } from './AllocationStrategy'

import {
  calculateMonthlySaving,
} from './goalCalculator'

import {
  formatMonthYear,
} from './dateUtils'


export class PriorityAllocationStrategy
  implements AllocationStrategy {

  allocate(
    goals: Goal[],
    budgets: MonthlyBudget[]
  ): AllocationResult[] {

    if (goals.length === 0) {
      return []
    }

    /*
     * ---------------------------------------------
     * TRACKING
     * ---------------------------------------------
     */

    const allocatedByGoal =
      new Map<number, number>()

    const monthlyAllocationsByGoal =
      new Map<
        number,
        MonthlyAllocation[]
      >()

    const completionDates =
      new Map<
        number,
        string | null
      >()

    for (const goal of goals) {

      allocatedByGoal.set(
        goal.id,
        0
      )

      monthlyAllocationsByGoal.set(
        goal.id,
        []
      )

      completionDates.set(
        goal.id,
        null
      )
    }


    /*
     * ---------------------------------------------
     * COMBINE BUDGETS FOR SAME MONTH
     * ---------------------------------------------
     */

    const budgetMap =
      new Map<string, number>()

    for (const budget of budgets) {

      const key =
        `${budget.year}-${budget.month}`

      const existing =
        budgetMap.get(key) ?? 0

      budgetMap.set(
        key,
        existing + budget.amount
      )
    }


    /*
     * ---------------------------------------------
     * FIND TIMELINE
     * ---------------------------------------------
     */

    const dates: Date[] = []

    for (const goal of goals) {

      const start =
        new Date(goal.startDate)

      const deadline =
        new Date(goal.deadline)

      if (
        !Number.isNaN(
          start.getTime()
        )
      ) {
        dates.push(start)
      }

      if (
        !Number.isNaN(
          deadline.getTime()
        )
      ) {
        dates.push(deadline)
      }
    }

    for (const budget of budgets) {

      dates.push(
        new Date(
          budget.year,
          budget.month,
          1
        )
      )
    }

    if (dates.length === 0) {
      return []
    }


    const earliestTime =
      Math.min(
        ...dates.map(
          date =>
            new Date(
              date.getFullYear(),
              date.getMonth(),
              1
            ).getTime()
        )
      )

    const latestTime =
      Math.max(
        ...goals.map(
          goal =>
            new Date(
              goal.deadline
            ).getTime()
        )
      )

    const current =
      new Date(
        earliestTime
      )

    const latestDeadline =
      new Date(
        latestTime
      )


    /*
     * ---------------------------------------------
     * PROCESS EVERY CALENDAR MONTH
     * ---------------------------------------------
     */

    let carryForward = 0

    while (
      current <= latestDeadline
    ) {

      const month =
        current.getMonth()

      const year =
        current.getFullYear()

      const key =
        `${year}-${month}`

      const newBudget =
        budgetMap.get(key) ?? 0


      /*
       * Carry unused money from previous months.
       */

      let availableBudget =
        carryForward +
        newBudget


      if (
        availableBudget <= 0
      ) {

        current.setMonth(
          current.getMonth() + 1
        )

        continue
      }


      /*
       * -------------------------------------------
       * ACTIVE GOALS
       * -------------------------------------------
       */

      const activeGoals =
        goals
          .filter(goal => {

            const start =
              new Date(
                goal.startDate
              )

            const deadline =
              new Date(
                goal.deadline
              )

            const currentMonth =
              new Date(
                year,
                month,
                1
              )

            const startMonth =
              new Date(
                start.getFullYear(),
                start.getMonth(),
                1
              )

            const deadlineMonth =
              new Date(
                deadline.getFullYear(),
                deadline.getMonth(),
                1
              )

            const alreadyAllocated =
              allocatedByGoal.get(
                goal.id
              ) ?? 0

            return (
              currentMonth >=
                startMonth &&

              currentMonth <=
                deadlineMonth &&

              alreadyAllocated <
                goal.targetAmount
            )
          })
          .sort((a, b) => {

            /*
             * ---------------------------------------
             * STRICT PRIORITY
             * ---------------------------------------
             *
             * Higher priority always comes first.
             */

            if (
              b.priority !==
              a.priority
            ) {

              return (
                b.priority -
                a.priority
              )
            }


            /*
             * If priorities are equal,
             * earlier deadline comes first.
             */

            return (
              new Date(
                a.deadline
              ).getTime() -

              new Date(
                b.deadline
              ).getTime()
            )
          })


      /*
       * -------------------------------------------
       * STRICT PRIORITY ALLOCATION
       * -------------------------------------------
       *
       * The highest-priority goal receives money
       * first.
       *
       * We do NOT distribute a monthly amount
       * across all goals.
       *
       * We continue down the priority list only
       * after the previous goal has been fully
       * funded or the budget has been exhausted.
       * -------------------------------------------
       */

      for (
        const goal of activeGoals
      ) {

        if (
          availableBudget <= 0
        ) {
          break
        }


        const alreadyAllocated =
          allocatedByGoal.get(
            goal.id
          ) ?? 0


        const remaining =
          Math.max(
            0,
            goal.targetAmount -
              alreadyAllocated
          )


        if (
          remaining <= 0
        ) {
          continue
        }


        /*
         * Give this goal as much as possible
         * before moving to the next priority.
         */

        const allocation =
          Math.min(
            availableBudget,
            remaining
          )


        if (
          allocation <= 0
        ) {
          continue
        }


        addAllocation(
          goal,
          allocation,
          month,
          year,
          allocatedByGoal,
          monthlyAllocationsByGoal,
          completionDates
        )


        availableBudget =
          roundMoney(
            availableBudget -
            allocation
          )
      }


      /*
       * -------------------------------------------
       * CARRY FORWARD
       * -------------------------------------------
       */

      carryForward =
        availableBudget


      current.setMonth(
        current.getMonth() + 1
      )
    }


    /*
     * ---------------------------------------------
     * CREATE FINAL RESULTS
     * ---------------------------------------------
     */

    return goals.map(goal => {

      const totalAllocated =
        allocatedByGoal.get(
          goal.id
        ) ?? 0


      /*
       * -------------------------------------------
       * REQUIRED MONTHLY
       * -------------------------------------------
       */

      const requiredMonthly =
        calculateMonthlySaving(
          goal.targetAmount,
          goal.startDate,
          goal.deadline
        )


      /*
       * -------------------------------------------
       * PLANNING OPTIONS
       * -------------------------------------------
       */

      const allocationPlans:
        AllocationPlan[] = []


      /*
       * -------------------------------------------
       * FIRST ELIGIBLE MONTH
       * -------------------------------------------
       */

      const firstEligibleDate =
        new Date(
          goal.startDate
        )

      const firstEligibleMonth =
        firstEligibleDate.getMonth()

      const firstEligibleYear =
        firstEligibleDate.getFullYear()


      /*
       * -------------------------------------------
       * LAST ELIGIBLE MONTH
       * -------------------------------------------
       */

      const deadlineDate =
        new Date(
          goal.deadline
        )

      const deadlineMonth =
        deadlineDate.getMonth()

      const deadlineYear =
        deadlineDate.getFullYear()


      /*
       * -------------------------------------------
       * COUNT ELIGIBLE MONTHS
       * -------------------------------------------
       */

      const eligibleMonths =
        countRemainingEligibleMonths(
          goal,
          firstEligibleYear,
          firstEligibleMonth
        )


      /*
       * -------------------------------------------
       * OPTION 1 — FUND IMMEDIATELY
       * -------------------------------------------
       */

      let planningCarryForward = 0

      if (
        budgets.length > 0
      ) {

        const planningStartTime =
          Math.min(
            ...budgets.map(
              budget =>
                new Date(
                  budget.year,
                  budget.month,
                  1
                ).getTime()
            )
          )

        const planningStartDate =
          new Date(
            planningStartTime
          )

        const planningCurrent =
          new Date(
            planningStartDate.getFullYear(),
            planningStartDate.getMonth(),
            1
          )

        const planningEndDate =
          new Date(
            firstEligibleYear,
            firstEligibleMonth,
            1
          )

        while (
          planningCurrent <=
          planningEndDate
        ) {

          const planningMonth =
            planningCurrent.getMonth()

          const planningYear =
            planningCurrent.getFullYear()

          const planningKey =
            `${planningYear}-${planningMonth}`

          const planningBudget =
            budgetMap.get(
              planningKey
            ) ?? 0

          planningCarryForward +=
            planningBudget

          planningCurrent.setMonth(
            planningCurrent.getMonth() + 1
          )
        }
      }


      /*
       * Only show immediate option when
       * enough money exists by the first
       * eligible month.
       */

      if (
        planningCarryForward >=
        goal.targetAmount
      ) {

        allocationPlans.push({

          type: 'immediate',

          description:
            `RM ${goal.targetAmount} in ${formatMonthYear(
              firstEligibleMonth,
              firstEligibleYear
            )}`,

          amount:
            goal.targetAmount,

          recommended:
            true,

          monthlyAllocations: [

            {
              month:
                firstEligibleMonth,

              year:
                firstEligibleYear,

              monthName:
                formatMonthYear(
                  firstEligibleMonth,
                  firstEligibleYear
                ),

              amount:
                goal.targetAmount,
            },

          ],

        })
      }


      /*
       * -------------------------------------------
       * OPTION 2 — SPREAD MONTHLY
       * -------------------------------------------
       */

      if (
        eligibleMonths > 1
      ) {

        const spreadMonthlyAllocations:
          MonthlyAllocation[] = []

        let spreadRemaining =
          goal.targetAmount

        let spreadCurrent =
          new Date(
            firstEligibleYear,
            firstEligibleMonth,
            1
          )

        while (
          spreadCurrent <=
          new Date(
            deadlineYear,
            deadlineMonth,
            1
          )
        ) {

          const spreadMonth =
            spreadCurrent.getMonth()

          const spreadYear =
            spreadCurrent.getFullYear()

          const remainingMonths =
            countRemainingEligibleMonths(
              goal,
              spreadYear,
              spreadMonth
            )

          const allocation =
            Math.min(
              roundMoney(
                spreadRemaining /
                remainingMonths
              ),
              spreadRemaining
            )

          spreadMonthlyAllocations.push({

            month:
              spreadMonth,

            year:
              spreadYear,

            monthName:
              formatMonthYear(
                spreadMonth,
                spreadYear
              ),

            amount:
              allocation,

          })

          spreadRemaining =
            roundMoney(
              spreadRemaining -
              allocation
            )

          spreadCurrent.setMonth(
            spreadCurrent.getMonth() + 1
          )
        }

        allocationPlans.push({

          type: 'monthly',

          description:
            `RM ${spreadMonthlyAllocations[0]?.amount ?? 0} / month from ${formatMonthYear(
              firstEligibleMonth,
              firstEligibleYear
            )} to ${formatMonthYear(
              deadlineMonth,
              deadlineYear
            )}`,

          amount:
            spreadMonthlyAllocations[0]?.amount ?? 0,

          recommended:
            planningCarryForward <
            goal.targetAmount,

          monthlyAllocations:
            spreadMonthlyAllocations,

        })
      }


      /*
       * -------------------------------------------
       * RESULT INFORMATION
       * -------------------------------------------
       */

      const shortfall =
        Math.max(
          0,
          goal.targetAmount -
            totalAllocated
        )


      const percentage =
        goal.targetAmount === 0

          ? 100

          : Math.min(
              100,
              Math.round(
                (
                  totalAllocated /
                  goal.targetAmount
                ) * 100
              )
            )


      return {

        goalId:
          goal.id,

        goalName:
          goal.name,

        targetAmount:
          goal.targetAmount,

        requiredMonthly,

        allocationPlans,

        totalAllocated,

        totalRequired:
          goal.targetAmount,

        shortfall,

        percentage,

        reachable:
          totalAllocated >=
          goal.targetAmount,

        completionDate:
          completionDates.get(
            goal.id
          ) ?? null,

        monthlyAllocations:
          monthlyAllocationsByGoal.get(
            goal.id
          ) ?? [],

      }
    })
  }
}


/*
 * =================================================
 * HELPERS
 * =================================================
 */

function roundMoney(
  amount: number
): number {

  return Math.round(
    (amount + Number.EPSILON) * 100
  ) / 100
}


/*
 * ---------------------------------------------
 * COUNT REMAINING ELIGIBLE MONTHS
 * ---------------------------------------------
 */

function countRemainingEligibleMonths(
  goal: Goal,
  currentYear: number,
  currentMonth: number
): number {

  const deadline =
    new Date(
      goal.deadline
    )

  const deadlineYear =
    deadline.getFullYear()

  const deadlineMonth =
    deadline.getMonth()


  const months =
    (
      deadlineYear -
      currentYear
    ) * 12 +
    (
      deadlineMonth -
      currentMonth
    ) +
    1


  return Math.max(
    1,
    months
  )
}


/*
 * ---------------------------------------------
 * ADD ALLOCATION
 * ---------------------------------------------
 */

function addAllocation(
  goal: Goal,
  amount: number,
  month: number,
  year: number,
  allocatedByGoal: Map<
    number,
    number
  >,
  monthlyAllocationsByGoal: Map<
    number,
    MonthlyAllocation[]
  >,
  completionDates: Map<
    number,
    string | null
  >
): void {

  const previous =
    allocatedByGoal.get(
      goal.id
    ) ?? 0


  const newTotal =
    roundMoney(
      previous + amount
    )


  allocatedByGoal.set(
    goal.id,
    newTotal
  )


  const allocations =
    monthlyAllocationsByGoal.get(
      goal.id
    ) ?? []


  /*
   * Combine allocations if the same goal
   * receives money twice in the same month.
   */

  const existing =
    allocations.find(
      allocation =>
        allocation.month === month &&
        allocation.year === year
    )


  if (existing) {

    existing.amount =
      roundMoney(
        existing.amount +
        amount
      )

  } else {

    allocations.push({

      month,

      year,

      monthName:
        formatMonthYear(
          month,
          year
        ),

      amount:
        roundMoney(
          amount
        ),

    })
  }


  monthlyAllocationsByGoal.set(
    goal.id,
    allocations
  )


  /*
   * Record the first month in which the goal
   * becomes fully funded.
   */

  if (
    newTotal >=
      goal.targetAmount &&

    completionDates.get(
      goal.id
    ) === null
  ) {

    completionDates.set(
      goal.id,
      formatMonthYear(
        month,
        year
      )
    )
  }
}