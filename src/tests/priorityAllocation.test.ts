import { describe, expect, it } from 'vitest'

import {
  PriorityAllocationStrategy,
} from '../logic/PriorityAllocationStrategy'

import type { Goal } from '../types/goal'
import type { MonthlyBudget } from '../types/monthlyBudget'


/*
 * =================================================
 * TEST HELPERS
 * =================================================
 */

function createGoal(
  overrides: Partial<Goal> = {}
): Goal {

  return {

    id: 1,

    name: 'Laptop',

    targetAmount: 1000,

    priority: 1,

    startDate: '2026-08-01',

    deadline: '2026-10-01',

    ...overrides,

  }

}


function createBudget(
  overrides: Partial<MonthlyBudget> = {}
): MonthlyBudget {

  return {

    id: 1,

    year: 2026,

    month: 7,

    amount: 1000,

    ...overrides,

  }

}


/*
 * =================================================
 * PRIORITY ALLOCATION TESTS
 * =================================================
 */

describe(
  'PriorityAllocationStrategy',
  () => {

    /*
     * ---------------------------------------------
     * EMPTY GOALS
     * ---------------------------------------------
     */

    it(
      'returns an empty result when there are no goals',
      () => {

        const strategy =
          new PriorityAllocationStrategy()

        const result =
          strategy.allocate(
            [],
            []
          )

        expect(result).toEqual([])

      }
    )


    /*
     * ---------------------------------------------
     * FULLY FUNDS GOAL
     * ---------------------------------------------
     */

    it(
      'fully funds a goal when enough budget is available',
      () => {

        const goal =
          createGoal({
            targetAmount: 500,
          })

        const budget =
          createBudget({
            amount: 1000,
          })

        const strategy =
          new PriorityAllocationStrategy()

        const result =
          strategy.allocate(
            [goal],
            [budget]
          )

        expect(
          result[0].totalAllocated
        ).toBe(500)

        expect(
          result[0].reachable
        ).toBe(true)

        expect(
          result[0].shortfall
        ).toBe(0)

      }
    )


    /*
     * ---------------------------------------------
     * INSUFFICIENT BUDGET
     * ---------------------------------------------
     */

    it(
      'marks a goal unreachable when there is insufficient budget',
      () => {

        const goal =
          createGoal({
            targetAmount: 1000,
          })

        const budget =
          createBudget({
            amount: 500,
          })

        const strategy =
          new PriorityAllocationStrategy()

        const result =
          strategy.allocate(
            [goal],
            [budget]
          )

        expect(
          result[0].totalAllocated
        ).toBe(500)

        expect(
          result[0].reachable
        ).toBe(false)

        expect(
          result[0].shortfall
        ).toBe(500)

      }
    )


    /*
     * ---------------------------------------------
     * COMBINE SAME-MONTH BUDGETS
     * ---------------------------------------------
     */

    it(
      'combines budgets from the same month',
      () => {

        const goal =
          createGoal({
            targetAmount: 1000,
          })

        const budgets = [

          createBudget({
            amount: 400,
          }),

          createBudget({
            amount: 600,
          }),

        ]

        const strategy =
          new PriorityAllocationStrategy()

        const result =
          strategy.allocate(
            [goal],
            budgets
          )

        expect(
          result[0].totalAllocated
        ).toBe(1000)

        expect(
          result[0].reachable
        ).toBe(true)

      }
    )


    /*
     * ---------------------------------------------
     * CARRY FORWARD
     * ---------------------------------------------
     */

    it(
      'carries unused budget into the next month',
      () => {

        const goal =
          createGoal({
            targetAmount: 1000,

            startDate:
              '2026-09-01',

            deadline:
              '2026-09-01',
          })

        const budgets = [

          createBudget({
            year: 2026,

            month: 7,

            amount: 500,
          }),

          createBudget({
            year: 2026,

            month: 8,

            amount: 500,
          }),

        ]

        const strategy =
          new PriorityAllocationStrategy()

        const result =
          strategy.allocate(
            [goal],
            budgets
          )

        expect(
          result[0].totalAllocated
        ).toBe(1000)

        expect(
          result[0].reachable
        ).toBe(true)

      }
    )


    /*
     * ---------------------------------------------
     * PRIORITY
     * ---------------------------------------------
     */

    it(
      'allocates to higher priority goals first',
      () => {

        const highPriority =
          createGoal({
            id: 1,

            name: 'Emergency',

            targetAmount: 800,

            priority: 5,
          })

        const lowPriority =
          createGoal({
            id: 2,

            name: 'Vacation',

            targetAmount: 800,

            priority: 1,
          })

        const budget =
          createBudget({
            amount: 800,
          })

        const strategy =
          new PriorityAllocationStrategy()

        const result =
          strategy.allocate(
            [
              highPriority,
              lowPriority,
            ],
            [budget]
          )

        const emergency =
          result.find(
            goal =>
              goal.goalName ===
              'Emergency'
          )

        const vacation =
          result.find(
            goal =>
              goal.goalName ===
              'Vacation'
          )

        expect(
          emergency?.totalAllocated
        ).toBe(800)

        expect(
          vacation?.totalAllocated
        ).toBe(0)

      }
    )


    /*
     * ---------------------------------------------
     * DEADLINE TIE BREAKER
     * ---------------------------------------------
     */

    it(
      'uses earlier deadline as a tie breaker',
      () => {

        const laptop =
          createGoal({
            id: 1,

            name: 'Laptop',

            targetAmount: 500,

            priority: 1,

            deadline:
              '2026-09-01',
          })

        const vacation =
          createGoal({
            id: 2,

            name: 'Vacation',

            targetAmount: 500,

            priority: 1,

            deadline:
              '2026-10-01',
          })

        const budget =
          createBudget({
            amount: 500,
          })

        const strategy =
          new PriorityAllocationStrategy()

        const result =
          strategy.allocate(
            [
              laptop,
              vacation,
            ],
            [budget]
          )

        const laptopResult =
          result.find(
            goal =>
              goal.goalName ===
              'Laptop'
          )

        const vacationResult =
          result.find(
            goal =>
              goal.goalName ===
              'Vacation'
          )

        expect(
          laptopResult?.totalAllocated
        ).toBe(500)

        expect(
          vacationResult?.totalAllocated
        ).toBe(0)

      }
    )


    /*
     * ---------------------------------------------
     * START DATE
     *
     * Money before the goal starts should
     * NOT be allocated before the start date.
     *
     * However, the money should be carried
     * forward and become available once the
     * goal starts.
     * ---------------------------------------------
     */

    it(
      'does not allocate money before a goal starts',
      () => {

        const goal =
          createGoal({

            id: 1,

            name: 'Laptop',

            targetAmount: 500,

            priority: 1,

            startDate:
              '2026-09-01',

            deadline:
              '2026-09-01',

          })


        const budgets = [

          createBudget({

            year: 2026,

            month: 7,

            amount: 500,

          }),

        ]


        const strategy =
          new PriorityAllocationStrategy()


        const result =
          strategy.allocate(
            [goal],
            budgets
          )


        const goalResult =
          result[0]


        /*
         * August is before the goal starts.
         *
         * Therefore there must be no
         * August allocation.
         */

        const augustAllocation =
          goalResult.monthlyAllocations.find(
            allocation =>

              allocation.year ===
                2026 &&

              allocation.month ===
                7

          )


        expect(
          augustAllocation?.amount ?? 0
        ).toBe(0)


        /*
         * The RM500 from August is carried
         * forward to September.
         *
         * September is month 8 because
         * JavaScript months are zero-based.
         */

        const septemberAllocation =
          goalResult.monthlyAllocations.find(
            allocation =>

              allocation.year ===
                2026 &&

              allocation.month ===
                8

          )


        expect(
          septemberAllocation?.amount ?? 0
        ).toBe(500)


        /*
         * The goal should now be fully funded.
         */

        expect(
          goalResult.totalAllocated
        ).toBe(500)

      }
    )


    /*
     * ---------------------------------------------
     * DEADLINE
     * ---------------------------------------------
     */

    it(
      'does not allocate to a goal after its deadline',
      () => {

        const goal =
          createGoal({

            targetAmount: 500,

            startDate:
              '2026-08-01',

            deadline:
              '2026-08-01',

          })


        const budgets = [

          createBudget({

            year: 2026,

            month: 7,

            amount: 500,

          }),

          createBudget({

            year: 2026,

            month: 8,

            amount: 500,

          }),

        ]


        const strategy =
          new PriorityAllocationStrategy()


        const result =
          strategy.allocate(
            [goal],
            budgets
          )


        expect(
          result[0].totalAllocated
        ).toBe(500)

        expect(
          result[0].monthlyAllocations
            .every(
              allocation =>

                allocation.year <
                  2026 ||

                (
                  allocation.year ===
                    2026 &&

                  allocation.month <=
                    7
                )
            )
        ).toBe(true)

      }
    )


    /*
     * ---------------------------------------------
     * TARGET LIMIT
     * ---------------------------------------------
     */

    it(
      'does not allocate more than the target amount',
      () => {

        const goal =
          createGoal({
            targetAmount: 500,
          })

        const budget =
          createBudget({
            amount: 2000,
          })

        const strategy =
          new PriorityAllocationStrategy()

        const result =
          strategy.allocate(
            [goal],
            [budget]
          )

        expect(
          result[0].totalAllocated
        ).toBe(500)

        expect(
          result[0].totalAllocated
        ).toBeLessThanOrEqual(
          goal.targetAmount
        )

      }
    )


    /*
     * ---------------------------------------------
     * MONTHLY ALLOCATION
     * ---------------------------------------------
     */

    it(
      'records monthly allocation correctly',
      () => {

        const goal =
          createGoal({
            targetAmount: 1000,

            startDate:
              '2026-08-01',

            deadline:
              '2026-09-01',
          })

        const budgets = [

          createBudget({
            year: 2026,

            month: 7,

            amount: 500,
          }),

          createBudget({
            year: 2026,

            month: 8,

            amount: 500,
          }),

        ]

        const strategy =
          new PriorityAllocationStrategy()

        const result =
          strategy.allocate(
            [goal],
            budgets
          )

        expect(
          result[0].monthlyAllocations
            .length
        ).toBeGreaterThan(0)

        expect(
          result[0].monthlyAllocations
            .every(
              allocation =>
                allocation.amount > 0
            )
        ).toBe(true)

      }
    )


    /*
     * ---------------------------------------------
     * COMPLETION DATE
     * ---------------------------------------------
     */

    it(
      'records the completion date',
      () => {

        const goal =
          createGoal({
            targetAmount: 500,

            startDate:
              '2026-08-01',

            deadline:
              '2026-08-01',
          })

        const budget =
          createBudget({
            amount: 500,
          })

        const strategy =
          new PriorityAllocationStrategy()

        const result =
          strategy.allocate(
            [goal],
            [budget]
          )

        expect(
          result[0].completionDate
        ).toBe('August 2026')

      }
    )

  }
)