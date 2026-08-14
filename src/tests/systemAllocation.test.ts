import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  createGoal,
  createBudget,
} from './testData'

import {
  generateSystemAllocation,
} from '../logic/SystemAllocation'


describe(
  'System Allocation',
  () => {


    /*
     * =============================================
     * LAPTOP + SPA
     * =============================================
     */

    it(
      'generates ranked allocation combinations',
      () => {

        const goals = [

          createGoal({

            id:
              1,

            name:
              'Laptop',

            targetAmount:
              200,

            priority:
              5,

            startDate:
              '2026-08-01',

            deadline:
              '2026-09-01',

          }),

          createGoal({

            id:
              2,

            name:
              'Spa',

            targetAmount:
              800,

            priority:
              3,

            startDate:
              '2026-08-01',

            deadline:
              '2026-09-01',

          }),

        ]


        const budgets = [

          createBudget({

            year:
              2026,

            month:
              7,

            amount:
              1000,

          }),

        ]


        const results =
          generateSystemAllocation(
            goals,
            budgets
          )


        expect(
          results.length
        ).toBeGreaterThan(0)


        expect(
          results.length
        ).toBeLessThanOrEqual(3)


        results.forEach(
          (
            result,
            index
          ) => {

            expect(
              result.rank
            ).toBe(
              index + 1
            )

          }
        )


        for (
          let i = 1;
          i < results.length;
          i++
        ) {

          expect(
            results[i - 1].score
          ).toBeGreaterThanOrEqual(
            results[i].score
          )

        }

      }
    )


    /*
     * =============================================
     * TOP 1 SHOULD FULLY FUND BOTH
     * =============================================
     */

    it(
      'places the strongest allocation first',
      () => {

        const goals = [

          createGoal({

            id:
              1,

            name:
              'Laptop',

            targetAmount:
              200,

            priority:
              5,

          }),

          createGoal({

            id:
              2,

            name:
              'Spa',

            targetAmount:
              800,

            priority:
              3,

          }),

        ]


        const budgets = [

          createBudget({

            amount:
              1000,

          }),

        ]


        const results =
          generateSystemAllocation(
            goals,
            budgets
          )


        const top =
          results[0]


        expect(
          top
        ).toBeDefined()


        const laptop =
          top.goals.find(
            goal =>
              goal.goalName ===
              'Laptop'
          )


        const spa =
          top.goals.find(
            goal =>
              goal.goalName ===
              'Spa'
          )


        expect(
          laptop?.totalAllocated
        ).toBe(200)


        expect(
          spa?.totalAllocated
        ).toBe(800)


        expect(
          laptop?.reachable
        ).toBe(true)


        expect(
          spa?.reachable
        ).toBe(true)

      }
    )


    /*
     * =============================================
     * SCORE ORDER
     * =============================================
     */

    it(
      'always sorts candidates from highest score to lowest score',
      () => {

        const goals = [

          createGoal({

            id:
              1,

            name:
              'Laptop',

            targetAmount:
              200,

            priority:
              5,

          }),

          createGoal({

            id:
              2,

            name:
              'Spa',

            targetAmount:
              800,

            priority:
              3,

          }),

        ]


        const budgets = [

          createBudget({

            amount:
              1000,

          }),

        ]


        const results =
          generateSystemAllocation(
            goals,
            budgets
          )


        for (
          let i = 1;
          i < results.length;
          i++
        ) {

          expect(
            results[i].score
          ).toBeLessThanOrEqual(
            results[i - 1].score
          )

        }

      }
    )


    /*
     * =============================================
     * TOP 2 / TOP 3 MUST BE UNIQUE
     * =============================================
     */

    it(
      'does not return duplicate combinations',
      () => {

        const goals = [

          createGoal({

            id:
              1,

            name:
              'Laptop',

            targetAmount:
              200,

          }),

          createGoal({

            id:
              2,

            name:
              'Spa',

            targetAmount:
              800,

          }),

        ]


        const budgets = [

          createBudget({

            amount:
              1000,

          }),

        ]


        const results =
          generateSystemAllocation(
            goals,
            budgets
          )


        const signatures =
          results.map(
            result =>

              result.goals
                .map(
                  goal =>
                    goal.monthlyAllocations
                      .map(
                        allocation =>
                          `${goal.goalId}-${allocation.year}-${allocation.month}-${allocation.amount}`
                      )
                      .join('|')
                )
                .join('||')

          )


        expect(
          new Set(signatures).size
        ).toBe(
          signatures.length
        )

      }
    )


    /*
     * =============================================
     * INSUFFICIENT BUDGET
     * =============================================
     */

    it(
      'generates allocation options when not all goals are reachable',
      () => {

        const goals = [

          createGoal({

            id:
              1,

            name:
              'Laptop',

            targetAmount:
              1000,

            priority:
              5,

          }),

          createGoal({

            id:
              2,

            name:
              'Holiday',

            targetAmount:
              1000,

            priority:
              3,

          }),

        ]


        const budgets = [

          createBudget({

            amount:
              500,

          }),

        ]


        const results =
          generateSystemAllocation(
            goals,
            budgets
          )


        expect(
          results.length
        ).toBeGreaterThan(0)


        const top =
          results[0]


        expect(
          top
        ).toBeDefined()


        const total =
          top.goals.reduce(
            (
              sum,
              goal
            ) =>
              sum +
              goal.totalAllocated,
            0
          )


        expect(
          total
        ).toBe(500)

      }
    )

  }
)