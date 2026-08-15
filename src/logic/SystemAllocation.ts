import type { Goal } from '../types/goal'
import type { MonthlyBudget } from '../types/monthlyBudget'

import type {
  MonthlyAllocation,
  SystemAllocation,
  SystemGoalAllocation,
} from '../types/Allocation'

import {
  formatMonthYear,
} from './dateUtils'


/*
 * =================================================
 * ALLOCATION MODES
 * =================================================
 *
 * The system can generate allocations using four
 * different strategies:
 *
 * priority  -> prioritise high-priority goals
 * balanced  -> distribute money evenly
 * deadline  -> prioritise how soon the deadline is
 * target    -> distribute according to remaining
 *             target amounts
 *
 * These different modes allow the system to create
 * multiple possible allocation combinations.
 * =================================================
 */

type AllocationMode =
  | 'priority'
  | 'balanced'
  | 'deadline'
  | 'target'


/*
 * =================================================
 * INTERNAL GOAL STATE
 * =================================================
 *
 * GoalState stores temporary information while an
 * allocation candidate is being generated.
 *
 * "goal" contains the original goal information.
 *
 * "allocated" keeps track of how much money has
 * already been assigned to the goal.
 *
 * "monthlyAllocations" records exactly when the
 * money was allocated.
 * =================================================
 */

interface GoalState {

  goal: Goal

  allocated: number

  monthlyAllocations:
    MonthlyAllocation[]

}


/*
 * =================================================
 * MAIN SYSTEM ALLOCATION
 * =================================================
 *
 * This function generates multiple possible
 * allocation combinations.
 *
 * Each combination uses a different allocation
 * strategy.
 *
 * The candidates are then:
 *
 * 1. Generated
 * 2. Deduplicated
 * 3. Scored
 * 4. Sorted
 * 5. Top 3 are returned
 * =================================================
 */

export function generateSystemAllocation(
  goals: Goal[],
  budgets: MonthlyBudget[]
): SystemAllocation[] {

  /*
   * There is nothing to calculate if there are no
   * goals or no budgets.
   */
  if (
    goals.length === 0 ||
    budgets.length === 0
  ) {

    return []

  }


  /*
   * -------------------------------------------------
   * GENERATE CANDIDATES
   * -------------------------------------------------
   *
   * Each candidate represents one possible way of
   * distributing the available money.
   */

  const candidates:
    SystemAllocation[] = []


  /*
   * -------------------------------------------------
   * BEST NORMAL PRIORITY ALLOCATION
   * -------------------------------------------------
   *
   * This is our baseline candidate.
   *
   * It uses the normal priority strategy without
   * any variation in goal ordering.
   */

  const priorityCandidate =
    generateCandidate(
      goals,
      budgets,
      'priority',
      false
    )


  /*
   * Only add the candidate if generation was
   * successful.
   */
  if (
    priorityCandidate !== null
  ) {

    candidates.push(
      priorityCandidate
    )

  }


  /*
   * -------------------------------------------------
   * ALTERNATIVE STRATEGIES
   * -------------------------------------------------
   *
   * Generate additional candidates using different
   * allocation modes.
   *
   * "variation: false" uses the normal ordering.
   *
   * "variation: true" rotates the first goal to the
   * end, producing a different possible combination.
   */

  const strategies:
    {
      mode: AllocationMode
      variation: boolean
    }[] = [

      {
        mode: 'balanced',
        variation: false,
      },

      {
        mode: 'deadline',
        variation: false,
      },

      {
        mode: 'target',
        variation: false,
      },

      {
        mode: 'priority',
        variation: true,
      },

      {
        mode: 'deadline',
        variation: true,
      },

      {
        mode: 'balanced',
        variation: true,
      },

      {
        mode: 'target',
        variation: true,
      },

    ]


  /*
   * Run every strategy and create a candidate.
   */
  for (
    const strategy of strategies
  ) {

    const candidate =
      generateCandidate(
        goals,
        budgets,
        strategy.mode,
        strategy.variation
      )


    /*
     * A null candidate means the allocation could
     * not be generated.
     */
    if (
      candidate !== null
    ) {

      candidates.push(
        candidate
      )

    }

  }


  /*
   * -------------------------------------------------
   * REMOVE EXACT DUPLICATES
   * -------------------------------------------------
   *
   * Different strategies can sometimes produce
   * exactly the same allocation.
   *
   * Duplicate candidates are removed so that the
   * final Top 3 contains genuinely different
   * combinations.
   */

  const uniqueCandidates =
    removeDuplicates(
      candidates
    )


  /*
   * -------------------------------------------------
   * SORT BY SCORE
   * -------------------------------------------------
   *
   * THIS IS IMPORTANT.
   *
   * We do NOT decide Top 1 / Top 2 / Top 3
   * based on generation order.
   *
   * All candidates are scored first.
   *
   * The candidate with the highest score becomes
   * Top 1, followed by Top 2 and Top 3.
   */

  uniqueCandidates.sort(
    (a, b) => {

      /*
       * Higher score comes first.
       */
      if (
        b.score !==
        a.score
      ) {

        return (
          b.score -
          a.score
        )

      }


      /*
       * If two candidates have exactly the same
       * score, prefer the one that allocates more
       * money earlier.
       *
       * This provides an additional way to decide
       * between equally-scored candidates.
       */

      const earlyA =
        calculateEarlyFundingFromResult(
          a
        )


      const earlyB =
        calculateEarlyFundingFromResult(
          b
        )


      if (
        earlyB !==
        earlyA
      ) {

        return (
          earlyB -
          earlyA
        )

      }


      /*
       * Final tie-breaker:
       *
       * If both candidates have the same score and
       * the same early funding, prefer the candidate
       * that uses fewer allocation months.
       *
       * Fewer months means the money is less spread
       * out.
       */

      const monthsA =
        countAllocationMonths(
          a
        )


      const monthsB =
        countAllocationMonths(
          b
        )


      return (
        monthsA -
        monthsB
      )

    }
  )


  /*
   * -------------------------------------------------
   * RETURN TOP 3
   * -------------------------------------------------
   *
   * Only the three highest-ranked candidates are
   * returned to the application.
   *
   * rank:
   *   1 = Best Combination
   *   2 = Second-Best Combination
   *   3 = Third-Best Combination
   */

  return uniqueCandidates
    .slice(0, 3)
    .map(
      (
        candidate,
        index
      ) => ({

        ...candidate,

        rank:
          index + 1,

        title:
          getRankTitle(
            index + 1
          ),

      })
    )
}


/*
 * =================================================
 * GENERATE CANDIDATE
 * =================================================
 *
 * Generates one complete allocation plan using
 * the selected allocation mode.
 *
 * For example:
 *
 * mode = priority
 *
 * The system will favour higher-priority goals.
 *
 * mode = deadline
 *
 * The system will favour goals with closer
 * deadlines.
 * =================================================
 */

function generateCandidate(
  goals: Goal[],
  budgets: MonthlyBudget[],
  mode: AllocationMode,
  variation: boolean
): SystemAllocation | null {

  /*
   * Create an internal state for every goal.
   *
   * Initially every goal has received RM0.
   */
  const states:
    GoalState[] =
      goals.map(
        goal => ({

          goal,

          allocated:
            0,

          monthlyAllocations:
            [],

        })
      )


  /*
   * -------------------------------------------------
   * COMBINE BUDGETS FOR SAME MONTH
   * -------------------------------------------------
   *
   * Multiple budget entries can belong to the same
   * month.
   *
   * Example:
   *
   * August:
   *   Budget 1 = RM300
   *   Budget 2 = RM200
   *
   * They are combined into:
   *
   * August = RM500
   *
   * The Map uses "year-month" as the key.
   */

  const budgetMap =
    new Map<string, number>()


  for (
    const budget of budgets
  ) {

    const key =
      `${budget.year}-${budget.month}`


    const existing =
      budgetMap.get(key) ?? 0


    budgetMap.set(
      key,
      existing +
      budget.amount
    )

  }


  /*
   * -------------------------------------------------
   * FIND TIMELINE
   * -------------------------------------------------
   *
   * Collect all relevant dates so the algorithm
   * knows which months need to be processed.
   */

  const dates:
    Date[] = []


  /*
   * Add every goal's start date and deadline.
   */
  for (
    const goal of goals
  ) {

    const start =
      new Date(
        goal.startDate
      )


    const deadline =
      new Date(
        goal.deadline
      )


    /*
     * Only add valid dates.
     */
    if (
      !Number.isNaN(
        start.getTime()
      )
    ) {

      dates.push(
        start
      )

    }


    if (
      !Number.isNaN(
        deadline.getTime()
      )
    ) {

      dates.push(
        deadline
      )

    }

  }


  /*
   * Also add every budget month to the timeline.
   */
  for (
    const budget of budgets
  ) {

    dates.push(
      new Date(
        budget.year,
        budget.month,
        1
      )
    )

  }


  /*
   * If there are no valid dates, allocation cannot
   * be generated.
   */
  if (
    dates.length === 0
  ) {

    return null

  }


  /*
   * Find the earliest month in the entire timeline.
   */
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


  /*
   * Find the latest goal deadline.
   *
   * The algorithm will continue processing months
   * until this date.
   */
  const latestTime =
    Math.max(
      ...goals.map(
        goal =>
          new Date(
            goal.deadline
          ).getTime()
      )
    )


  /*
   * Start processing from the earliest month.
   */
  let current =
    new Date(
      earliestTime
    )


  /*
   * Convert the latest timestamp into a Date so
   * it can be used as the stopping condition.
   */
  const latestDeadline =
    new Date(
      latestTime
    )


  /*
   * -------------------------------------------------
   * CARRY FORWARD
   * -------------------------------------------------
   *
   * Money that is not used in the current month is
   * carried into the next month.
   *
   * Example:
   *
   * August budget = RM1000
   * Used           = RM700
   *
   * Carry forward = RM300
   *
   * September can therefore use:
   *
   * September budget + RM300
   */

  let carryForward = 0


  /*
   * -------------------------------------------------
   * PROCESS EVERY MONTH
   * -------------------------------------------------
   *
   * The algorithm moves month by month through the
   * entire planning period.
   */

  while (
    current <=
    latestDeadline
  ) {

    const month =
      current.getMonth()


    const year =
      current.getFullYear()


    /*
     * Create the key used to retrieve this month's
     * budget from budgetMap.
     */
    const key =
      `${year}-${month}`


    const newBudget =
      budgetMap.get(key) ?? 0


    /*
     * Available money consists of:
     *
     * 1. Money carried from previous months
     * 2. New money available this month
     */
    let availableBudget =
      carryForward +
      newBudget


    /*
     * Only attempt allocation when there is money
     * available.
     */
    if (
      availableBudget > 0
    ) {

      /*
       * -------------------------------------------------
       * ACTIVE GOALS
       * -------------------------------------------------
       *
       * A goal is active when:
       *
       * current month >= goal start month
       * AND
       * current month <= goal deadline month
       * AND
       * goal has not already been fully funded.
       */

      const activeGoals =
        states.filter(
          state => {

            const start =
              new Date(
                state.goal.startDate
              )


            const deadline =
              new Date(
                state.goal.deadline
              )


            /*
             * Convert the current date to the first
             * day of the month so that comparisons
             * are performed at month level.
             */
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


            return (

              currentMonth >=
                startMonth &&

              currentMonth <=
                deadlineMonth &&

              state.allocated <
                state.goal.targetAmount

            )

          }
        )


      /*
       * -------------------------------------------------
       * ORDER GOALS
       * -------------------------------------------------
       *
       * The selected allocation strategy determines
       * the order in which active goals are considered.
       */

      const orderedGoals =
        sortGoals(
          activeGoals,
          mode,
          variation
        )


      /*
       * -------------------------------------------------
       * ALLOCATE
       * -------------------------------------------------
       *
       * Process each active goal according to the
       * selected ordering.
       */

      for (
        const state of orderedGoals
      ) {

        /*
         * Stop when there is no money remaining.
         */
        if (
          availableBudget <= 0
        ) {

          break

        }


        /*
         * Calculate how much this goal still needs.
         */
        const remaining =
          Math.max(
            0,
            state.goal.targetAmount -
              state.allocated
          )


        /*
         * Skip goals that are already fully funded.
         */
        if (
          remaining <= 0
        ) {

          continue

        }


        /*
         * Ask the selected strategy how much money
         * should be assigned to this goal.
         */
        const allocation =
          calculateAllocation(
            state,
            orderedGoals,
            availableBudget,
            mode,
            year,
            month
          )


        /*
         * Protect against allocating:
         *
         * - more than the strategy requested
         * - more than the available budget
         * - more than the goal still needs
         */
        const actual =
          Math.min(
            allocation,
            availableBudget,
            remaining
          )


        /*
         * Ignore zero or negative allocations.
         */
        if (
          actual <= 0
        ) {

          continue

        }


        /*
         * Record the allocation in the goal state.
         */
        addAllocation(
          state,
          actual,
          month,
          year
        )


        /*
         * Remove the allocated amount from the
         * current month's available budget.
         */
        availableBudget =
          roundMoney(
            availableBudget -
            actual
          )

      }

    }


    /*
     * -------------------------------------------------
     * CARRY UNUSED MONEY
     * -------------------------------------------------
     *
     * Any money that was not allocated this month
     * becomes available in the next month.
     */

    carryForward =
      availableBudget


    /*
     * Move to the next calendar month.
     */
    current.setMonth(
      current.getMonth() + 1
    )

  }


  /*
   * -------------------------------------------------
   * CREATE RESULT
   * -------------------------------------------------
   *
   * Convert the internal GoalState objects into
   * the SystemGoalAllocation format expected by
   * the rest of the application.
   */

  const systemGoals:
    SystemGoalAllocation[] =
    states.map(
      state => {

        /*
         * Calculate the percentage of the target
         * that has been funded.
         */
        const percentage =
          state.goal.targetAmount === 0

            ? 100

            : Math.min(
                100,

                Math.round(
                  (
                    state.allocated /
                    state.goal.targetAmount
                  ) *
                  100
                )
              )


        return {

          goalId:
            state.goal.id,

          goalName:
            state.goal.name,

          targetAmount:
            state.goal.targetAmount,

          totalAllocated:
            roundMoney(
              state.allocated
            ),

          percentage,

          /*
           * A goal is reachable if its entire target
           * amount has been allocated.
           */
          reachable:
            state.allocated >=
            state.goal.targetAmount,

          monthlyAllocations:
            state.monthlyAllocations,

        }

      }
    )


  /*
   * -------------------------------------------------
   * CALCULATE SCORE
   * -------------------------------------------------
   *
   * Once the allocation has been generated, calculate
   * how good this candidate is.
   */

  const score =
    calculateScore(
      states
    )


  /*
   * Return the candidate.
   *
   * rank and title are temporarily empty because
   * ranking is performed later after all candidates
   * have been generated and sorted.
   */

  return {

    rank:
      0,

    title:
      '',

    score,

    goals:
      systemGoals,

  }

}


/*
 * =================================================
 * SORT GOALS
 * =================================================
 *
 * Determines the order in which goals receive money.
 *
 * The order depends on the selected allocation mode.
 * =================================================
 */

function sortGoals(
  states: GoalState[],
  mode: AllocationMode,
  variation: boolean
): GoalState[] {

  /*
   * Copy the array so the original states array is
   * not directly modified by sorting.
   */
  const sorted =
    [...states]


  sorted.sort(
    (a, b) => {

      /*
       * Calculate how much each goal still needs.
       *
       * This is mainly used by the TARGET strategy.
       */

      const aRemaining =
        Math.max(
          0,
          a.goal.targetAmount -
            a.allocated
        )


      const bRemaining =
        Math.max(
          0,
          b.goal.targetAmount -
            b.allocated
        )


      /*
       * -------------------------------------------------
       * PRIORITY
       * -------------------------------------------------
       *
       * Higher priority number comes first.
       *
       * Example:
       *
       * Goal A priority = 5
       * Goal B priority = 2
       *
       * Goal A comes first.
       *
       * If priorities are equal, the earlier deadline
       * comes first.
       */

      if (
        mode === 'priority'
      ) {

        if (
          b.goal.priority !==
          a.goal.priority
        ) {

          return (
            b.goal.priority -
            a.goal.priority
          )

        }


        return (
          new Date(
            a.goal.deadline
          ).getTime() -

          new Date(
            b.goal.deadline
          ).getTime()
        )

      }


      /*
       * -------------------------------------------------
       * DEADLINE
       * -------------------------------------------------
       *
       * Goals with earlier deadlines come first.
       */

      if (
        mode === 'deadline'
      ) {

        return (
          new Date(
            a.goal.deadline
          ).getTime() -

          new Date(
            b.goal.deadline
          ).getTime()
        )

      }


      /*
       * -------------------------------------------------
       * TARGET
       * -------------------------------------------------
       *
       * Goals with a larger remaining target come first.
       */

      if (
        mode === 'target'
      ) {

        return (
          bRemaining -
          aRemaining
        )

      }


      /*
       * -------------------------------------------------
       * BALANCED
       * -------------------------------------------------
       *
       * The goal with the lowest percentage of its
       * target completed comes first.
       *
       * This attempts to keep progress between goals
       * relatively balanced.
       */

      const aPercentage =
        a.goal.targetAmount === 0

          ? 1

          : a.allocated /
            a.goal.targetAmount


      const bPercentage =
        b.goal.targetAmount === 0

          ? 1

          : b.allocated /
            b.goal.targetAmount


      /*
       * Lower progress percentage comes first.
       */
      if (
        aPercentage !==
        bPercentage
      ) {

        return (
          aPercentage -
          bPercentage
        )

      }


      /*
       * If progress is equal, use deadline as the
       * tie-breaker.
       */
      return (
        new Date(
          a.goal.deadline
        ).getTime() -

        new Date(
          b.goal.deadline
        ).getTime()
      )

    }
  )


  /*
   * -------------------------------------------------
   * VARIATION
   * -------------------------------------------------
   *
   * Rotate the first goal to the end of the list.
   *
   * Example:
   *
   * Normal:
   *   A → B → C
   *
   * Variation:
   *   B → C → A
   *
   * This allows the system to explore a different
   * allocation combination.
   */

  if (
    variation &&
    sorted.length > 1
  ) {

    const first =
      sorted.shift()


    if (
      first !== undefined
    ) {

      sorted.push(
        first
      )

    }

  }


  return sorted
}


/*
 * =================================================
 * CALCULATE ALLOCATION
 * =================================================
 *
 * Determines how much money should be given to the
 * current goal for the current month.
 *
 * The calculation depends on the selected mode.
 * =================================================
 */

function calculateAllocation(
  state: GoalState,
  orderedGoals: GoalState[],
  availableBudget: number,
  mode: AllocationMode,
  year: number,
  month: number
): number {

  /*
   * Calculate how much money the goal still needs.
   */
  const remaining =
    Math.max(
      0,
      state.goal.targetAmount -
        state.allocated
    )


  /*
   * -------------------------------------------------
   * PRIORITY
   * -------------------------------------------------
   *
   * Fund the highest-priority goal first.
   *
   * The goal can receive as much as it needs, up
   * to the available budget.
   */

  if (
    mode === 'priority'
  ) {

    return Math.min(
      remaining,
      availableBudget
    )

  }


  /*
   * -------------------------------------------------
   * DEADLINE
   * -------------------------------------------------
   *
   * Spread the remaining target across the number
   * of months remaining until the deadline.
   *
   * Example:
   *
   * Remaining = RM600
   * Months remaining = 3
   *
   * Allocation = RM200/month
   */

  if (
    mode === 'deadline'
  ) {

    const deadline =
      new Date(
        state.goal.deadline
      )


    const remainingMonths =
      Math.max(

        1,

        (
          deadline.getFullYear() -
          year
        ) * 12 +

        (
          deadline.getMonth() -
          month
        ) +

        1

      )


    return Math.min(

      remaining,

      roundMoney(
        remaining /
        remainingMonths
      )

    )

  }


  /*
   * -------------------------------------------------
   * TARGET
   * -------------------------------------------------
   *
   * Divide the available money proportionally
   * according to how much each goal still needs.
   *
   * Example:
   *
   * Goal A remaining = RM600
   * Goal B remaining = RM400
   *
   * Total remaining = RM1000
   *
   * Available budget = RM500
   *
   * Goal A receives 60% = RM300
   * Goal B receives 40% = RM200
   */

  if (
    mode === 'target'
  ) {

    /*
     * Calculate the total remaining amount across
     * all active goals.
     */
    const totalRemaining =
      orderedGoals.reduce(
        (sum, current) =>
          sum +

          Math.max(
            0,

            current.goal.targetAmount -
              current.allocated
          ),

        0
      )


    /*
     * If nothing remains to be funded, there is
     * nothing to allocate.
     */
    if (
      totalRemaining <= 0
    ) {

      return 0

    }


    /*
     * Calculate this goal's proportional share.
     */
    return Math.min(

      remaining,

      roundMoney(

        availableBudget *

        (
          remaining /
          totalRemaining
        )

      )

    )

  }


  /*
   * -------------------------------------------------
   * BALANCED
   * -------------------------------------------------
   *
   * Divide the available budget equally between
   * the active goals.
   */

  const activeGoalCount =
    orderedGoals.length


  /*
   * No active goals means nothing can be allocated.
   */
  if (
    activeGoalCount <= 0
  ) {

    return 0

  }


  /*
   * Divide the available budget equally.
   */
  return Math.min(

    remaining,

    roundMoney(
      availableBudget /
      activeGoalCount
    )

  )

}


/*
 * =================================================
 * ADD ALLOCATION
 * =================================================
 *
 * Records money allocated to a goal.
 *
 * It updates both:
 *
 * 1. The total amount allocated to the goal
 * 2. The monthly allocation history
 * =================================================
 */

function addAllocation(
  state: GoalState,
  amount: number,
  month: number,
  year: number
): void {

  /*
   * Add the new amount to the goal's total.
   *
   * roundMoney prevents floating-point precision
   * problems such as:
   *
   * 0.1 + 0.2 = 0.30000000000000004
   */

  state.allocated =
    roundMoney(
      state.allocated +
      amount
    )


  /*
   * Check whether this goal already has an
   * allocation recorded for the current month.
   */

  const existing =
    state.monthlyAllocations.find(
      allocation =>
        allocation.month === month &&
        allocation.year === year
    )


  /*
   * If the goal already received money this month,
   * combine the new amount with the existing amount.
   */

  if (
    existing
  ) {

    existing.amount =
      roundMoney(
        existing.amount +
        amount
      )

  } else {

    /*
     * Otherwise create a new monthly allocation
     * record.
     */

    state.monthlyAllocations.push({

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

}


/*
 * =================================================
 * SCORE
 * =================================================
 *
 * Calculates how good a candidate allocation is.
 *
 * SCORE WEIGHTS
 *
 * Funding             35%
 * Completion speed    25%
 * Early funding       20%
 * Priority            10%
 * Less spreading      10%
 *
 * Total               100%
 *
 * A higher score means the candidate is considered
 * better by the system.
 * =================================================
 */

function calculateScore(
  states: GoalState[]
): number {

  /*
   * There is no score when there are no goals.
   */
  if (
    states.length === 0
  ) {

    return 0

  }


  /*
   * =================================================
   * 1. FUNDING SCORE — 35%
   * =================================================
   *
   * Measures how much of the total target amount
   * has been funded.
   *
   * Example:
   *
   * Total target = RM2000
   * Allocated     = RM1500
   *
   * Funding score = 1500 / 2000 = 0.75
   */

  const totalTarget =
    states.reduce(
      (sum, state) =>
        sum +
        state.goal.targetAmount,

      0
    )


  const totalAllocated =
    states.reduce(
      (sum, state) =>
        sum +
        state.allocated,

      0
    )


  /*
   * Convert funding into a value between 0 and 1.
   */
  const fundingScore =
    totalTarget <= 0

      ? 1

      : Math.min(
          1,
          totalAllocated /
            totalTarget
        )


  /*
   * =================================================
   * 2. COMPLETION SPEED — 25%
   * =================================================
   *
   * Earlier completion gets a higher score.
   *
   * A goal completed at the beginning of its
   * planning period receives a higher score than
   * one completed close to its deadline.
   */

  let completionTotal = 0


  /*
   * Calculate completion performance for every goal.
   */
  for (
    const state of states
  ) {

    /*
     * A zero-target goal is considered completely
     * fulfilled.
     */
    if (
      state.goal.targetAmount <= 0
    ) {

      completionTotal += 1

      continue

    }


    /*
     * Goals that have not been fully funded do not
     * contribute to the completion score.
     */
    if (
      state.allocated <
      state.goal.targetAmount
    ) {

      continue

    }


    const allocations =
      state.monthlyAllocations


    /*
     * A fully funded goal should have at least one
     * allocation record.
     */
    if (
      allocations.length === 0
    ) {

      continue

    }


    const start =
      new Date(
        state.goal.startDate
      )


    const deadline =
      new Date(
        state.goal.deadline
      )


    /*
     * The final allocation month is treated as the
     * completion month.
     */
    const completion =
      allocations[
        allocations.length - 1
      ]


    /*
     * Convert start and deadline into month-level
     * dates.
     */
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


    /*
     * Convert the final allocation into a Date.
     */
    const completionMonth =
      new Date(
        completion.year,
        completion.month,
        1
      )


    /*
     * Calculate how many months are available from
     * the start month to the deadline.
     */
    const totalMonths =
      Math.max(

        1,

        (
          deadlineMonth.getFullYear() -
          startMonth.getFullYear()
        ) * 12 +

        (
          deadlineMonth.getMonth() -
          startMonth.getMonth()
        ) +

        1

      )


    /*
     * Calculate how many months were actually used
     * before the goal was fully funded.
     */
    const monthsUsed =
      Math.max(

        1,

        (
          completionMonth.getFullYear() -
          startMonth.getFullYear()
        ) * 12 +

        (
          completionMonth.getMonth() -
          startMonth.getMonth()
        ) +

        1

      )


    /*
     * Convert completion speed into a score between
     * 0 and 1.
     *
     * Completing earlier gives a larger value.
     */
    const completionScore =
      Math.max(

        0,

        1 -
        (
          (monthsUsed - 1) /
          totalMonths
        )

      )


    completionTotal +=
      completionScore

  }


  /*
   * Average completion score across all goals.
   */
  const completionScore =
    completionTotal /
    states.length


  /*
   * =================================================
   * 3. EARLY FUNDING — 20%
   * =================================================
   *
   * This measures how much money is allocated early
   * in a goal's timeline.
   *
   * Earlier allocations receive a larger weight.
   *
   * Example:
   *
   * Top 2:
   * Spa = RM400 / RM800 = 50%
   *
   * Top 3:
   * Spa = RM500 / RM800 = 62.5%
   *
   * Therefore Top 3 gets a better early-funding
   * score.
   */

  let earlyFundingTotal = 0


  /*
   * Calculate early funding for every goal.
   */
  for (
    const state of states
  ) {

    /*
     * Zero-target goals are considered fully funded.
     */
    if (
      state.goal.targetAmount <= 0
    ) {

      earlyFundingTotal += 1

      continue

    }


    /*
     * A goal without allocations cannot contribute
     * to the early-funding score.
     */
    if (
      state.monthlyAllocations.length === 0
    ) {

      continue

    }


    const start =
      new Date(
        state.goal.startDate
      )


    const deadline =
      new Date(
        state.goal.deadline
      )


    /*
     * Convert the start and deadline to month-level
     * dates.
     */
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


    /*
     * Calculate the number of months available for
     * this goal.
     */
    const totalMonths =
      Math.max(

        1,

        (
          deadlineMonth.getFullYear() -
          startMonth.getFullYear()
        ) * 12 +

        (
          deadlineMonth.getMonth() -
          startMonth.getMonth()
        ) +

        1

      )


    /*
     * Calculate weighted funding.
     *
     * Earlier months receive more weight.
     *
     * This means that allocating RM500 early can be
     * considered better than allocating RM500 much
     * later, even if the final total is identical.
     */

    let weightedFunding = 0

    let totalWeight = 0


    /*
     * Process every monthly allocation for this goal.
     */
    for (
      const allocation of
        state.monthlyAllocations
    ) {

      const allocationMonth =
        new Date(
          allocation.year,
          allocation.month,
          1
        )


      /*
       * Calculate how many months after the goal's
       * start this allocation happened.
       *
       * 0 = first eligible month
       * 1 = second month
       * 2 = third month
       * etc.
       */

      const monthsFromStart =
        Math.max(

          0,

          (
            allocationMonth.getFullYear() -
            startMonth.getFullYear()
          ) * 12 +

          (
            allocationMonth.getMonth() -
            startMonth.getMonth()
          )

        )


      /*
       * Earlier month = higher weight.
       *
       * First month:
       *     weight = totalMonths
       *
       * Second month:
       *     weight = totalMonths - 1
       *
       * Later months receive smaller weights.
       */

      const weight =
        Math.max(

          1,

          totalMonths -
          monthsFromStart

        )


      /*
       * Calculate what percentage of the goal target
       * this allocation represents.
       */
      const fundingPercentage =
        Math.min(

          1,

          allocation.amount /
            state.goal.targetAmount

        )


      /*
       * Combine the funding percentage with its
       * time-based weight.
       */
      weightedFunding +=
        fundingPercentage *
        weight


      totalWeight +=
        weight

    }


    /*
     * Convert the weighted result into a value
     * between 0 and 1.
     */
    if (
      totalWeight > 0
    ) {

      earlyFundingTotal +=
        Math.min(

          1,

          weightedFunding /
          totalWeight

        )

    }

  }


  /*
   * Average early funding score across all goals.
   */
  const earlyFundingScore =
    earlyFundingTotal /
    states.length


  /*
   * =================================================
   * 4. PRIORITY — 10%
   * =================================================
   *
   * Measures whether money was allocated to goals
   * according to their priority.
   *
   * Higher-priority goals have a larger influence
   * on this score.
   */

  const totalPriority =
    states.reduce(
      (sum, state) =>
        sum +

        Math.max(
          1,
          state.goal.priority
        ),

      0
    )


  let priorityScore = 0


  if (
    totalPriority > 0
  ) {

    priorityScore =
      states.reduce(
        (sum, state) => {

          /*
           * Calculate how much of this goal has been
           * funded.
           */
          const progress =
            state.goal.targetAmount <= 0

              ? 1

              : Math.min(

                  1,

                  state.allocated /
                    state.goal.targetAmount

                )


          /*
           * Multiply the goal's funding progress by
           * its priority.
           *
           * This makes funding a high-priority goal
           * contribute more to the score.
           */

          return (

            sum +

            (
              progress *

              Math.max(
                1,
                state.goal.priority
              )
            )

          )

        },

        0
      ) /
      totalPriority

  }


  /*
   * =================================================
   * 5. LESS SPREADING — 10%
   * =================================================
   *
   * Rewards candidates that reach their targets
   * using fewer allocation months.
   *
   * Fewer months = higher score.
   *
   * Example:
   *
   * 1 month -> 1.0
   * 2 months -> 0.5
   * 4 months -> 0.25
   */

  let spreadingTotal = 0


  for (
    const state of states
  ) {

    const months =
      state.monthlyAllocations.length


    /*
     * A goal using one month or fewer gets the
     * maximum spreading score.
     */
    if (
      months <= 1
    ) {

      spreadingTotal += 1

      continue

    }


    /*
     * More allocation months means a lower score.
     */
    spreadingTotal +=
      1 /
      months

  }


  /*
   * Average spreading score across all goals.
   */
  const spreadingScore =
    spreadingTotal /
    states.length


  /*
   * =================================================
   * FINAL SCORE
   * =================================================
   *
   * Combine all five scoring categories.
   *
   * Each score is multiplied by its percentage
   * weight.
   *
   * Funding          = 35%
   * Completion       = 25%
   * Early funding    = 20%
   * Priority         = 10%
   * Less spreading   = 10%
   *
   * Total            = 100%
   */

  const score =

    (
      fundingScore *
      35
    )

    +

    (
      completionScore *
      25
    )

    +

    (
      earlyFundingScore *
      20
    )

    +

    (
      priorityScore *
      10
    )

    +

    (
      spreadingScore *
      10
    )


  /*
   * Round the final score to two decimal places.
   */
  return Math.round(
    score * 100
  ) / 100
}


/*
 * =================================================
 * CALCULATE EARLY FUNDING FROM FINAL RESULT
 * =================================================
 *
 * Used only as a tie-breaker when two candidates
 * have the same score.
 *
 * It looks at the first allocation made for each
 * goal and calculates what percentage of the goal's
 * target that first allocation represents.
 *
 * A larger first allocation means better early
 * funding.
 * =================================================
 */

function calculateEarlyFundingFromResult(
  candidate: SystemAllocation
): number {

  let total = 0

  let count = 0


  /*
   * Check every goal in the candidate.
   */
  for (
    const goal of candidate.goals
  ) {

    /*
     * Ignore goals with no target.
     */
    if (
      goal.targetAmount <= 0
    ) {

      continue

    }


    /*
     * Ignore goals that received no money.
     */
    if (
      goal.monthlyAllocations.length === 0
    ) {

      continue

    }


    /*
     * Get the first month in which this goal
     * received money.
     */
    const firstAllocation =
      goal.monthlyAllocations[0]


    /*
     * Calculate the percentage of the target
     * represented by that first allocation.
     */
    total +=
      firstAllocation.amount /
      goal.targetAmount


    count++

  }


  /*
   * Avoid division by zero if no goals have
   * allocations.
   */
  if (
    count === 0
  ) {

    return 0

  }


  /*
   * Return the average first-allocation percentage.
   */
  return total / count
}


/*
 * =================================================
 * COUNT ALLOCATION MONTHS
 * =================================================
 *
 * Counts the total number of monthly allocation
 * records across all goals.
 *
 * This is used as the final tie-breaker.
 *
 * Fewer allocation months are preferred.
 * =================================================
 */

function countAllocationMonths(
  candidate: SystemAllocation
): number {

  return candidate.goals.reduce(

    (sum, goal) =>
      sum +
      goal.monthlyAllocations.length,

    0

  )

}


/*
 * =================================================
 * REMOVE DUPLICATES
 * =================================================
 *
 * Different strategies can sometimes generate the
 * exact same allocation.
 *
 * This function creates a unique signature for each
 * candidate and removes candidates with identical
 * signatures.
 * =================================================
 */

function removeDuplicates(
  candidates:
    SystemAllocation[]
): SystemAllocation[] {

  /*
   * Stores signatures that have already appeared.
   */
  const seen =
    new Set<string>()


  /*
   * Stores the candidates that are actually unique.
   */
  const unique:
    SystemAllocation[] =
    []


  /*
   * Check every candidate.
   */
  for (
    const candidate of candidates
  ) {

    /*
     * Create a signature based on:
     *
     * goal ID
     * year
     * month
     * allocation amount
     *
     * If two candidates have the same signature,
     * they represent the same allocation plan.
     */

    const signature =
      candidate.goals
        .map(
          goal => {

            const monthly =
              goal.monthlyAllocations
                .map(
                  allocation =>
                    `${allocation.year}-${allocation.month}-${roundMoney(allocation.amount)}`
                )
                .join(',')


            return (
              `${goal.goalId}:${monthly}`
            )

          }
        )
        .join('|')


    /*
     * If this exact allocation has already been
     * encountered, skip it.
     */
    if (
      seen.has(signature)
    ) {

      continue

    }


    /*
     * Record the signature so future duplicates
     * can be detected.
     */
    seen.add(
      signature
    )


    /*
     * Keep the unique candidate.
     */
    unique.push(
      candidate
    )

  }


  return unique
}


/*
 * =================================================
 * RANK TITLE
 * =================================================
 *
 * Converts the numeric ranking into a human-readable
 * title for the UI.
 *
 * 1 -> Best Combination
 * 2 -> Second-Best Combination
 * 3 -> Third-Best Combination
 * =================================================
 */

function getRankTitle(
  rank: number
): string {

  if (
    rank === 1
  ) {

    return 'Best Combination'

  }


  if (
    rank === 2
  ) {

    return 'Second-Best Combination'

  }


  return 'Third-Best Combination'
}


/*
 * =================================================
 * ROUND MONEY
 * =================================================
 *
 * JavaScript numbers can sometimes produce small
 * floating-point precision errors.
 *
 * For example:
 *
 * 0.1 + 0.2
 *
 * may produce:
 *
 * 0.30000000000000004
 *
 * This function rounds monetary values to two
 * decimal places.
 * =================================================
 */

function roundMoney(
  amount: number
): number {

  return Math.round(
    (
      amount +
      Number.EPSILON
    ) * 100
  ) / 100

}