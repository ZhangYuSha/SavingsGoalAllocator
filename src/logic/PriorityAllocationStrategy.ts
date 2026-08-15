// Import the Goal type.
// A Goal contains information such as:
// - goal ID
// - goal name
// - target amount
// - start date
// - deadline
// - priority
import type { Goal } from '../types/goal'


// Import the MonthlyBudget type.
// A MonthlyBudget represents the amount of spare money
// available for a particular month.
import type { MonthlyBudget } from '../types/monthlyBudget'


// Import the types used by the allocation algorithm.
// AllocationResult = final result for one goal.
// MonthlyAllocation = amount allocated to a goal in one month.
// AllocationPlan = alternative ways of funding a goal.
import type {
  AllocationResult,
  MonthlyAllocation,
  AllocationPlan
} from '../types/Allocation'


// Import the strategy interface.
// This class implements the allocate() method defined
// by AllocationStrategy.
import type { AllocationStrategy } from './AllocationStrategy'


// Used to calculate the average monthly amount required
// to reach a goal by its deadline.
import {
  calculateMonthlySaving,
} from './goalCalculator'


// Used to convert a numeric month/year into a readable
// format such as "August 2026".
import {
  formatMonthYear,
} from './dateUtils'


/**
 * PriorityAllocationStrategy determines how available
 * monthly spare cash is distributed between savings goals.
 *
 * The strategy follows strict priority:
 *
 * 1. Higher-priority goals receive money first.
 * 2. If priorities are equal, the earlier deadline wins.
 * 3. A goal receives as much money as possible before
 *    moving to the next goal.
 * 4. Unused money is carried forward to later months.
 */
export class PriorityAllocationStrategy
  implements AllocationStrategy {

  /**
   * Allocates available budgets across the user's goals.
   *
   * @param goals - Savings goals entered by the user.
   * @param budgets - Monthly spare-cash budgets.
   * @returns Allocation results for every goal.
   */
  allocate(
    goals: Goal[],
    budgets: MonthlyBudget[]
  ): AllocationResult[] {

    // If there are no goals, there is nothing to allocate.
    if (goals.length === 0) {
      return []
    }


    /*
     * =============================================
     * TRACKING ALLOCATION INFORMATION
     * =============================================
     *
     * These Maps keep track of the algorithm's
     * progress while it processes each month.
     */


    // Stores the total amount allocated to each goal.
    //
    // Example:
    // Goal 1 -> RM 500
    // Goal 2 -> RM 200
    const allocatedByGoal =
      new Map<number, number>()


    // Stores the month-by-month allocation history
    // for every goal.
    //
    // Example:
    // Goal 1 ->
    //   August 2026: RM 300
    //   September 2026: RM 200
    const monthlyAllocationsByGoal =
      new Map<
        number,
        MonthlyAllocation[]
      >()


    // Stores the month when each goal becomes fully funded.
    //
    // null means the goal has not been fully funded yet.
    const completionDates =
      new Map<
        number,
        string | null
      >()


    // Initialise tracking information for every goal.
    for (const goal of goals) {

      // Initially, nothing has been allocated.
      allocatedByGoal.set(
        goal.id,
        0
      )

      // Initially, the goal has no monthly allocations.
      monthlyAllocationsByGoal.set(
        goal.id,
        []
      )

      // Initially, the goal has no completion date.
      completionDates.set(
        goal.id,
        null
      )
    }


    /*
     * =============================================
     * COMBINE BUDGETS FOR THE SAME MONTH
     * =============================================
     *
     * More than one MonthlyBudget can exist for
     * the same month.
     *
     * Therefore, combine them into one total.
     *
     * Example:
     *
     * August -> RM 300
     * August -> RM 200
     *
     * becomes:
     *
     * August -> RM 500
     */


    const budgetMap =
      new Map<string, number>()


    for (const budget of budgets) {

      // Create a unique key for the month.
      //
      // JavaScript months are zero-based:
      // January = 0
      // August = 7
      const key =
        `${budget.year}-${budget.month}`


      // Get the existing amount for this month.
      // If none exists, use 0.
      const existing =
        budgetMap.get(key) ?? 0


      // Add the current budget to the existing
      // budget for the same month.
      budgetMap.set(
        key,
        existing + budget.amount
      )
    }


    /*
     * =============================================
     * FIND THE TIMELINE
     * =============================================
     *
     * The allocator needs to know:
     *
     * - which month to start processing
     * - which month to stop processing
     */


    const dates: Date[] = []


    // Add every goal's start date and deadline
    // to the timeline.
    for (const goal of goals) {

      const start =
        new Date(goal.startDate)

      const deadline =
        new Date(goal.deadline)


      // Only add valid dates.
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


    // Add every budget month to the timeline.
    for (const budget of budgets) {

      dates.push(
        new Date(
          budget.year,
          budget.month,
          1
        )
      )
    }


    // If there are no valid dates, there is no
    // timeline to process.
    if (dates.length === 0) {
      return []
    }


    // Find the earliest date from all goals and budgets.
    //
    // Dates are normalised to the first day of their
    // respective month so that the algorithm works
    // at calendar-month level.
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


    // Find the latest goal deadline.
    //
    // This becomes the final month the allocator
    // needs to process.
    const latestTime =
      Math.max(
        ...goals.map(
          goal =>
            new Date(
              goal.deadline
            ).getTime()
        )
      )


    // Start processing from the earliest month.
    const current =
      new Date(
        earliestTime
      )


    // Store the latest deadline as a Date object.
    const latestDeadline =
      new Date(
        latestTime
      )


    /*
     * =============================================
     * PROCESS EVERY CALENDAR MONTH
     * =============================================
     */


    // Money that was available in a previous month
    // but was not used.
    //
    // This money can be used in future months.
    let carryForward = 0


    // Continue until the latest goal deadline.
    while (
      current <= latestDeadline
    ) {

      // Get the current calendar month.
      const month =
        current.getMonth()


      // Get the current year.
      const year =
        current.getFullYear()


      // Create the same key format used in budgetMap.
      const key =
        `${year}-${month}`


      // Get the budget available for this month.
      //
      // If there is no budget, use 0.
      const newBudget =
        budgetMap.get(key) ?? 0


      /*
       * ===========================================
       * AVAILABLE BUDGET
       * ===========================================
       *
       * Available money =
       *
       * previous unused money
       * +
       * this month's new budget
       */


      let availableBudget =
        carryForward +
        newBudget


      // If there is no money available,
      // move directly to the next month.
      if (
        availableBudget <= 0
      ) {

        current.setMonth(
          current.getMonth() + 1
        )

        continue
      }


      /*
       * ===========================================
       * FIND ACTIVE GOALS
       * ===========================================
       *
       * A goal is active when:
       *
       * 1. Current month >= goal start month
       * 2. Current month <= goal deadline month
       * 3. The goal has not already been fully funded
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


            // Convert the current date into
            // the first day of its month.
            const currentMonth =
              new Date(
                year,
                month,
                1
              )


            // Convert the goal start date into
            // the first day of its month.
            const startMonth =
              new Date(
                start.getFullYear(),
                start.getMonth(),
                1
              )


            // Convert the deadline into
            // the first day of its month.
            const deadlineMonth =
              new Date(
                deadline.getFullYear(),
                deadline.getMonth(),
                1
              )


            // Find how much has already been allocated.
            const alreadyAllocated =
              allocatedByGoal.get(
                goal.id
              ) ?? 0


            // Keep the goal only if it is currently
            // eligible to receive money.
            return (
              currentMonth >=
                startMonth &&

              currentMonth <=
                deadlineMonth &&

              alreadyAllocated <
                goal.targetAmount
            )
          })


          // Sort active goals according to priority.
          .sort((a, b) => {

            /*
             * =======================================
             * STRICT PRIORITY
             * =======================================
             *
             * Higher priority always comes first.
             *
             * Example:
             *
             * Goal A = priority 5
             * Goal B = priority 3
             *
             * Goal A comes first.
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
             * If two goals have the same priority,
             * the goal with the earlier deadline
             * comes first.
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
       * ===========================================
       * ALLOCATE MONEY BY PRIORITY
       * ===========================================
       *
       * The highest-priority goal gets money first.
       *
       * The algorithm does NOT split the budget
       * equally between all goals.
       *
       * Instead:
       *
       * 1. Give money to Goal 1.
       * 2. If Goal 1 is fully funded, move to Goal 2.
       * 3. Continue until the budget is exhausted.
       */


      for (
        const goal of activeGoals
      ) {

        // Stop if all available money has
        // already been allocated.
        if (
          availableBudget <= 0
        ) {
          break
        }


        // Find how much this goal has already received.
        const alreadyAllocated =
          allocatedByGoal.get(
            goal.id
          ) ?? 0


        // Calculate how much money the goal still needs.
        const remaining =
          Math.max(
            0,
            goal.targetAmount -
              alreadyAllocated
          )


        // Skip the goal if it has already
        // been fully funded.
        if (
          remaining <= 0
        ) {
          continue
        }


        /*
         * Allocate as much as possible to this goal.
         *
         * We cannot allocate more than:
         *
         * - the available budget
         * - the goal's remaining amount
         */
        const allocation =
          Math.min(
            availableBudget,
            remaining
          )


        // Safety check.
        if (
          allocation <= 0
        ) {
          continue
        }


        // Record this allocation.
        //
        // This updates:
        // - total allocated
        // - monthly allocation history
        // - completion date
        addAllocation(
          goal,
          allocation,
          month,
          year,
          allocatedByGoal,
          monthlyAllocationsByGoal,
          completionDates
        )


        // Remove the allocated money from
        // the current month's available budget.
        availableBudget =
          roundMoney(
            availableBudget -
            allocation
          )
      }


      /*
       * ===========================================
       * CARRY FORWARD UNUSED MONEY
       * ===========================================
       *
       * If money remains after all active goals
       * have been considered, save it for the
       * following month.
       */


      carryForward =
        availableBudget


      // Move to the next calendar month.
      current.setMonth(
        current.getMonth() + 1
      )
    }


    /*
     * =============================================
     * CREATE FINAL RESULTS
     * =============================================
     *
     * At this point, the actual allocation has
     * already been completed.
     *
     * Now we convert the tracking information
     * into AllocationResult objects for the UI.
     */


    return goals.map(goal => {

      // Get the total amount actually allocated
      // to this goal.
      const totalAllocated =
        allocatedByGoal.get(
          goal.id
        ) ?? 0


      /*
       * ===========================================
       * REQUIRED MONTHLY SAVING
       * ===========================================
       *
       * This is the average amount required per
       * eligible calendar month.
       *
       * IMPORTANT:
       * This is a planning figure.
       * It does not control the actual allocator.
       */


      const requiredMonthly =
        calculateMonthlySaving(
          goal.targetAmount,
          goal.startDate,
          goal.deadline
        )


      /*
       * ===========================================
       * PLANNING OPTIONS
       * ===========================================
       *
       * These are alternative ways the user could
       * think about funding the goal.
       */


      const allocationPlans:
        AllocationPlan[] = []


      /*
       * ===========================================
       * FIRST ELIGIBLE MONTH
       * ===========================================
       *
       * A goal can start receiving money from the
       * month containing its start date.
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
       * ===========================================
       * LAST ELIGIBLE MONTH
       * ===========================================
       *
       * This is the month containing the deadline.
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
       * ===========================================
       * COUNT ELIGIBLE MONTHS
       * ===========================================
       *
       * Example:
       *
       * August -> December
       *
       * = 5 eligible months
       */


      const eligibleMonths =
        countRemainingEligibleMonths(
          goal,
          firstEligibleYear,
          firstEligibleMonth
        )


      /*
       * ===========================================
       * OPTION 1 — FUND IMMEDIATELY
       * ===========================================
       *
       * Determine whether enough money has
       * accumulated by the goal's first eligible
       * month to fund the entire goal immediately.
       */


      let planningCarryForward = 0


      if (
        budgets.length > 0
      ) {

        // Find the earliest budget month.
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


        // Start at the earliest budget month.
        const planningCurrent =
          new Date(
            planningStartDate.getFullYear(),
            planningStartDate.getMonth(),
            1
          )


        // Stop at the goal's first eligible month.
        const planningEndDate =
          new Date(
            firstEligibleYear,
            firstEligibleMonth,
            1
          )


        // Add all available budgets up to the
        // first eligible month.
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


          // Move to the next month.
          planningCurrent.setMonth(
            planningCurrent.getMonth() + 1
          )
        }
      }


      /*
       * Only create the "Fund immediately" option
       * if the accumulated budget is enough to
       * completely fund the goal.
       */


      if (
        planningCarryForward >=
        goal.targetAmount
      ) {

        allocationPlans.push({

          // Identify this as the immediate option.
          type: 'immediate',


          // Text displayed to the user.
          description:
            `RM ${goal.targetAmount} in ${formatMonthYear(
              firstEligibleMonth,
              firstEligibleYear
            )}`,


          // Amount required immediately.
          amount:
            goal.targetAmount,


          // Immediate funding is recommended
          // when enough money is already available.
          recommended:
            true,


          // Show the entire target amount
          // in the first eligible month.
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
       * ===========================================
       * OPTION 2 — SPREAD MONTHLY
       * ===========================================
       *
       * Instead of funding everything immediately,
       * distribute the target amount across the
       * eligible months.
       */


      if (
        eligibleMonths > 1
      ) {

        const spreadMonthlyAllocations:
          MonthlyAllocation[] = []


        // Amount still needed to complete the goal.
        let spreadRemaining =
          goal.targetAmount


        // Start from the first eligible month.
        let spreadCurrent =
          new Date(
            firstEligibleYear,
            firstEligibleMonth,
            1
          )


        // Continue until the deadline month.
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


          // Recalculate how many months remain.
          //
          // This allows the algorithm to distribute
          // the remaining amount evenly.
          const remainingMonths =
            countRemainingEligibleMonths(
              goal,
              spreadYear,
              spreadMonth
            )


          // Calculate this month's allocation.
          //
          // Example:
          // RM 1,000 remaining
          // 4 months remaining
          //
          // RM 1,000 / 4 = RM 250
          const allocation =
            Math.min(
              roundMoney(
                spreadRemaining /
                remainingMonths
              ),
              spreadRemaining
            )


          // Record this month's allocation.
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


          // Remove this month's allocation from
          // the remaining target.
          spreadRemaining =
            roundMoney(
              spreadRemaining -
              allocation
            )


          // Move to the next month.
          spreadCurrent.setMonth(
            spreadCurrent.getMonth() + 1
          )
        }


        // Add the monthly plan to the available
        // planning options.
        allocationPlans.push({

          type: 'monthly',


          // Display the first month's amount
          // as the monthly planning amount.
          description:
            `RM ${spreadMonthlyAllocations[0]?.amount ?? 0} / month from ${formatMonthYear(
              firstEligibleMonth,
              firstEligibleYear
            )} to ${formatMonthYear(
              deadlineMonth,
              deadlineYear
            )}`,


          // The first month's allocation is used
          // as the displayed monthly amount.
          amount:
            spreadMonthlyAllocations[0]?.amount ?? 0,


          // Recommend monthly spreading when there
          // is not enough money to fund the entire
          // goal immediately.
          recommended:
            planningCarryForward <
            goal.targetAmount,


          // Store the complete month-by-month plan.
          monthlyAllocations:
            spreadMonthlyAllocations,

        })
      }


      /*
       * ===========================================
       * RESULT INFORMATION
       * ===========================================
       *
       * Calculate the final statistics that will
       * be displayed by the UI.
       */


      // Amount still missing from the target.
      const shortfall =
        Math.max(
          0,
          goal.targetAmount -
            totalAllocated
        )


      // Calculate how much of the target has
      // been funded as a percentage.
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


      // Return the final result for this goal.
      return {

        // Original goal ID.
        goalId:
          goal.id,


        // Original goal name.
        goalName:
          goal.name,


        // Original target amount.
        targetAmount:
          goal.targetAmount,


        // Average monthly amount required.
        requiredMonthly,


        // Alternative planning options.
        allocationPlans,


        // Actual amount allocated by the algorithm.
        totalAllocated,


        // Total amount required.
        totalRequired:
          goal.targetAmount,


        // Amount still missing.
        shortfall,


        // Percentage of the target funded.
        percentage,


        // True when the full target was allocated.
        reachable:
          totalAllocated >=
          goal.targetAmount,


        // Month in which the goal was first
        // completely funded.
        completionDate:
          completionDates.get(
            goal.id
          ) ?? null,


        // Actual month-by-month allocation history.
        monthlyAllocations:
          monthlyAllocationsByGoal.get(
            goal.id
          ) ?? [],

      }
    })
  }
}


/*
 * =============================================
 * HELPER: ROUND MONEY
 * =============================================
 *
 * JavaScript floating-point arithmetic can produce
 * values such as:
 *
 * 0.1 + 0.2 = 0.30000000000000004
 *
 * This function rounds the value to 2 decimal places
 * so that money calculations remain clean.
 */
function roundMoney(
  amount: number
): number {

  return Math.round(
    (amount + Number.EPSILON) * 100
  ) / 100
}


/*
 * =============================================
 * HELPER: COUNT REMAINING ELIGIBLE MONTHS
 * =============================================
 *
 * Counts the number of calendar months from the
 * supplied month until the goal deadline.
 *
 * The calculation is inclusive.
 *
 * Example:
 *
 * August -> August
 * = 1
 *
 * August -> September
 * = 2
 *
 * August -> December
 * = 5
 */
function countRemainingEligibleMonths(
  goal: Goal,
  currentYear: number,
  currentMonth: number
): number {

  // Get the goal deadline.
  const deadline =
    new Date(
      goal.deadline
    )


  const deadlineYear =
    deadline.getFullYear()


  const deadlineMonth =
    deadline.getMonth()


  // Calculate the number of months between
  // the current month and the deadline.
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


  // Always return at least 1 month.
  return Math.max(
    1,
    months
  )
}


/*
 * =============================================
 * HELPER: ADD ALLOCATION
 * =============================================
 *
 * Updates all tracking structures whenever
 * money is allocated to a goal.
 *
 * It performs three important tasks:
 *
 * 1. Updates the goal's total allocation.
 * 2. Records the monthly allocation.
 * 3. Records the completion month if the goal
 *    becomes fully funded.
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

  // Get the amount previously allocated
  // to this goal.
  const previous =
    allocatedByGoal.get(
      goal.id
    ) ?? 0


  // Add the new allocation to the previous total.
  const newTotal =
    roundMoney(
      previous + amount
    )


  // Save the updated total.
  allocatedByGoal.set(
    goal.id,
    newTotal
  )


  // Get this goal's existing monthly
  // allocation history.
  const allocations =
    monthlyAllocationsByGoal.get(
      goal.id
    ) ?? []


  /*
   * If this goal already received money during
   * the same month, combine the amounts instead
   * of creating another row.
   */


  const existing =
    allocations.find(
      allocation =>
        allocation.month === month &&
        allocation.year === year
    )


  if (existing) {

    // Add the new amount to the existing
    // allocation for this month.
    existing.amount =
      roundMoney(
        existing.amount +
        amount
      )

  } else {

    // Otherwise create a new monthly allocation.
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


  // Save the updated allocation history.
  monthlyAllocationsByGoal.set(
    goal.id,
    allocations
  )


  /*
   * Record the first month when the goal
   * becomes fully funded.
   *
   * We only set this if:
   *
   * newTotal >= target
   *
   * AND no completion date has been recorded yet.
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