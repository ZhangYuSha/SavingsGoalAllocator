import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  PriorityAllocationStrategy,
} from '../logic/PriorityAllocationStrategy'

import {
  createGoal,
  createBudget,
} from './testData'


describe(
  'Planning Options',
  () => {

    const strategy =
      new PriorityAllocationStrategy()


    /*
     * =============================================
     * IMMEDIATE OPTION
     * =============================================
     */

    it(
      'creates an immediate option when the target can be funded immediately',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              200,

          }),

        ]


        const budgets = [

          createBudget({

            amount:
              200,

          }),

        ]


        const result =
          strategy.allocate(
            goals,
            budgets
          )


        const immediate =
          result[0]
            .allocationPlans
            .find(
              plan =>
                plan.type ===
                'immediate'
            )


        expect(
          immediate
        ).toBeDefined()


        expect(
          immediate?.amount
        ).toBe(200)

      }
    )


    /*
     * =============================================
     * MONTHLY OPTION
     * =============================================
     */

    it(
      'creates a monthly option for a multi-month goal',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              800,

            startDate:
              '2026-08-01',

            deadline:
              '2026-09-01',

          }),

        ]


        const budgets = [

          createBudget({

            month:
              7,

            amount:
              400,

          }),

          createBudget({

            month:
              8,

            amount:
              400,

          }),

        ]


        const result =
          strategy.allocate(
            goals,
            budgets
          )


        const monthly =
          result[0]
            .allocationPlans
            .find(
              plan =>
                plan.type ===
                'monthly'
            )


        expect(
          monthly
        ).toBeDefined()


        expect(
          monthly
            ?.monthlyAllocations
            .length
        ).toBeGreaterThan(1)

      }
    )


    /*
     * =============================================
     * SAME-MONTH GOAL
     * =============================================
     */

    it(
      'does not create a separate monthly option for a one-month goal',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              500,

            startDate:
              '2026-08-01',

            deadline:
              '2026-08-31',

          }),

        ]


        const budgets = [

          createBudget({

            amount:
              500,

          }),

        ]


        const result =
          strategy.allocate(
            goals,
            budgets
          )


        const monthly =
          result[0]
            .allocationPlans
            .find(
              plan =>
                plan.type ===
                'monthly'
            )


        expect(
          monthly
        ).toBeUndefined()

      }
    )


    /*
     * =============================================
     * DEADLINE BOUNDARY
     * =============================================
     */

    it(
      'allocates budget when the budget month matches the deadline month',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              500,

            startDate:
              '2026-08-01',

            deadline:
              '2026-08-31',

          }),

        ]


        const budgets = [

          createBudget({

            year:
              2026,

            month:
              7,

            amount:
              500,

          }),

        ]


        const result =
          strategy.allocate(
            goals,
            budgets
          )


        expect(
          result[0]
            .totalAllocated
        ).toBe(500)


        expect(
          result[0]
            .reachable
        ).toBe(true)

      }
    )


    /*
     * =============================================
     * AFTER DEADLINE
     * =============================================
     */

    it(
      'does not use budget after the goal deadline',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              500,

            startDate:
              '2026-08-01',

            deadline:
              '2026-08-31',

          }),

        ]


        const budgets = [

          createBudget({

            year:
              2026,

            month:
              9,

            amount:
              500,

          }),

        ]


        const result =
          strategy.allocate(
            goals,
            budgets
          )


        expect(
          result[0]
            .totalAllocated
        ).toBe(0)


        expect(
          result[0]
            .reachable
        ).toBe(false)

      }
    )

  }
)