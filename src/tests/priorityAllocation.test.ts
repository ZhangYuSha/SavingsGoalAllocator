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
  'PriorityAllocationStrategy Edge Cases',
  () => {

    const strategy =
      new PriorityAllocationStrategy()


    /*
     * =============================================
     * EMPTY INPUT
     * =============================================
     */

    it(
      'returns an empty result when there are no goals',
      () => {

        const budgets = [

          createBudget({

            amount:
              500,

          }),

        ]


        const result =
          strategy.allocate(
            [],
            budgets
          )


        expect(
          result
        ).toEqual([])

      }
    )


    it(
      'returns an empty result when there are no goals and no budgets',
      () => {

        const result =
          strategy.allocate(
            [],
            []
          )


        expect(
          result
        ).toEqual([])

      }
    )


    /*
     * =============================================
     * NO BUDGET
     * =============================================
     */

    it(
      'marks a goal unreachable when there is no budget',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              500,

          }),

        ]


        const result =
          strategy.allocate(
            goals,
            []
          )


        expect(
          result[0]
            .totalAllocated
        ).toBe(0)


        expect(
          result[0]
            .reachable
        ).toBe(false)


        expect(
          result[0]
            .shortfall
        ).toBe(500)

      }
    )


    /*
     * =============================================
     * ZERO BUDGET
     * =============================================
     */

    it(
      'does not allocate a zero budget',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              500,

          }),

        ]


        const budgets = [

          createBudget({

            amount:
              0,

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
            .monthlyAllocations
            .length
        ).toBe(0)

      }
    )


    /*
     * =============================================
     * ZERO TARGET
     * =============================================
     */

    it(
      'handles a zero target goal',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              0,

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


        expect(
          result[0]
            .totalAllocated
        ).toBe(0)


        expect(
          result[0]
            .shortfall
        ).toBe(0)


        expect(
          result[0]
            .percentage
        ).toBe(100)


        expect(
          result[0]
            .reachable
        ).toBe(true)

      }
    )


    /*
     * =============================================
     * EXACT FUNDING
     * =============================================
     */

    it(
      'fully funds a goal when budget exactly matches the target',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              500,

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


        expect(
          result[0]
            .totalAllocated
        ).toBe(500)


        expect(
          result[0]
            .shortfall
        ).toBe(0)


        expect(
          result[0]
            .percentage
        ).toBe(100)


        expect(
          result[0]
            .reachable
        ).toBe(true)

      }
    )


    /*
     * =============================================
     * BUDGET GREATER THAN TARGET
     * =============================================
     */

    it(
      'does not allocate more than the target amount',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              500,

          }),

        ]


        const budgets = [

          createBudget({

            amount:
              1000,

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
            .totalAllocated
        ).not.toBeGreaterThan(500)

      }
    )


    /*
     * =============================================
     * PARTIAL FUNDING
     * =============================================
     */

    it(
      'records the correct shortfall for partial funding',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              1000,

          }),

        ]


        const budgets = [

          createBudget({

            amount:
              400,

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
        ).toBe(400)


        expect(
          result[0]
            .shortfall
        ).toBe(600)


        expect(
          result[0]
            .reachable
        ).toBe(false)


        expect(
          result[0]
            .percentage
        ).toBe(40)

      }
    )


    /*
     * =============================================
     * MULTIPLE BUDGETS SAME MONTH
     * =============================================
     */

    it(
      'combines multiple budgets from the same month',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              500,

          }),

        ]


        const budgets = [

          createBudget({

            year:
              2026,

            month:
              7,

            amount:
              200,

          }),

          createBudget({

            year:
              2026,

            month:
              7,

            amount:
              300,

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

      }
    )


    /*
     * =============================================
     * MULTIPLE MONTHS
     * =============================================
     */

    it(
      'allocates budget across multiple months',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              600,

            startDate:
              '2026-07-01',

            deadline:
              '2026-09-01',

          }),

        ]


        const budgets = [

          createBudget({

            year:
              2026,

            month:
              6,

            amount:
              200,

          }),

          createBudget({

            year:
              2026,

            month:
              7,

            amount:
              200,

          }),

          createBudget({

            year:
              2026,

            month:
              8,

            amount:
              200,

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
        ).toBe(600)


        expect(
          result[0]
            .reachable
        ).toBe(true)

      }
    )


    /*
     * =============================================
     * GOAL STARTS AFTER FIRST BUDGET
     * =============================================
     */

    it(
      'carries unused money into a goal that starts later',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              500,

            startDate:
              '2026-09-01',

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
              200,

          }),

          createBudget({

            year:
              2026,

            month:
              8,

            amount:
              300,

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
     * GOAL NOT ACTIVE YET
     * =============================================
     */

    it(
      'carries budget forward until the goal becomes active',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              500,

            startDate:
              '2026-09-01',

            deadline:
              '2026-10-01',

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

      }
    )


    /*
     * =============================================
     * HIGH PRIORITY VS LOW PRIORITY
     * =============================================
     */

    it(
      'sorts goals by priority',
      () => {

        const goals = [

          createGoal({

            id:
              1,

            targetAmount:
              500,

            priority:
              10,

          }),

          createGoal({

            id:
              2,

            targetAmount:
              500,

            priority:
              1,

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


        const high =
          result.find(
            goal =>
              goal.goalId === 1
          )


        const low =
          result.find(
            goal =>
              goal.goalId === 2
          )


        expect(
          high?.totalAllocated
        ).toBeGreaterThan(
          low?.totalAllocated ?? 0
        )

      }
    )


    /*
     * =============================================
     * EQUAL PRIORITY
     * =============================================
     */

    it(
      'uses earlier deadline when priorities are equal',
      () => {

        const goals = [

          createGoal({

            id:
              1,

            targetAmount:
              500,

            priority:
              5,

            deadline:
              '2026-08-01',

          }),

          createGoal({

            id:
              2,

            targetAmount:
              500,

            priority:
              5,

            deadline:
              '2026-10-01',

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


        const earlier =
          result.find(
            goal =>
              goal.goalId === 1
          )


        const later =
          result.find(
            goal =>
              goal.goalId === 2
          )


        expect(
          earlier?.totalAllocated
        ).toBeGreaterThan(
          later?.totalAllocated ?? 0
        )

      }
    )


    /*
     * =============================================
     * THREE COMPETING GOALS
     * =============================================
     */

    it(
      'handles three goals competing for limited surplus',
      () => {

        const goals = [

          createGoal({

            id:
              1,

            targetAmount:
              500,

            priority:
              10,

          }),

          createGoal({

            id:
              2,

            targetAmount:
              500,

            priority:
              5,

          }),

          createGoal({

            id:
              3,

            targetAmount:
              500,

            priority:
              1,

          }),

        ]


        const budgets = [

          createBudget({

            amount:
              600,

          }),

        ]


        const result =
          strategy.allocate(
            goals,
            budgets
          )


        const total =
          result.reduce(
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
        ).toBe(600)


        expect(
          result[0]
            .totalAllocated
        ).toBeLessThanOrEqual(500)


        expect(
          result[1]
            .totalAllocated
        ).toBeLessThanOrEqual(500)


        expect(
          result[2]
            .totalAllocated
        ).toBeLessThanOrEqual(500)

      }
    )


    /*
     * =============================================
     * BUDGET EXHAUSTION
     * =============================================
     */

    it(
      'does not allocate more money than the total available budget',
      () => {

        const goals = [

          createGoal({

            id:
              1,

            targetAmount:
              1000,

          }),

          createGoal({

            id:
              2,

            targetAmount:
              1000,

          }),

        ]


        const budgets = [

          createBudget({

            amount:
              700,

          }),

        ]


        const result =
          strategy.allocate(
            goals,
            budgets
          )


        const total =
          result.reduce(
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
        ).toBe(700)

      }
    )


    /*
     * =============================================
     * TARGET REACHED BEFORE DEADLINE
     * =============================================
     */

    it(
      'stops allocating to a goal once its target is reached',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              300,

            startDate:
              '2026-07-01',

            deadline:
              '2026-09-01',

          }),

        ]


        const budgets = [

          createBudget({

            year:
              2026,

            month:
              6,

            amount:
              300,

          }),

          createBudget({

            year:
              2026,

            month:
              7,

            amount:
              300,

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
        ).toBe(300)


        expect(
          result[0]
            .totalAllocated
        ).not.toBeGreaterThan(300)

      }
    )


    /*
     * =============================================
     * COMPLETION DATE
     * =============================================
     */

    it(
      'records a completion date when target is reached',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              500,

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


        expect(
          result[0]
            .completionDate
        ).not.toBeNull()

      }
    )


    /*
     * =============================================
     * MONTHLY ALLOCATION MERGING
     * =============================================
     */

    it(
      'does not create duplicate monthly allocation rows',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              500,

          }),

        ]


        const budgets = [

          createBudget({

            year:
              2026,

            month:
              7,

            amount:
              200,

          }),

          createBudget({

            year:
              2026,

            month:
              7,

            amount:
              300,

          }),

        ]


        const result =
          strategy.allocate(
            goals,
            budgets
          )


        const allocations =
          result[0]
            .monthlyAllocations


        expect(
          allocations.length
        ).toBe(1)


        expect(
          allocations[0]
            .amount
        ).toBe(500)

      }
    )


    /*
     * =============================================
     * PERCENTAGE
     * =============================================
     */

    it(
      'calculates percentage correctly for partial funding',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              800,

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


        expect(
          result[0]
            .percentage
        ).toBe(25)

      }
    )


    /*
     * =============================================
     * SMALL DECIMAL VALUES
     * =============================================
     */

    it(
      'handles decimal monetary values correctly',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              100.01,

          }),

        ]


        const budgets = [

          createBudget({

            amount:
              100.01,

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
        ).toBe(100.01)


        expect(
          result[0]
            .shortfall
        ).toBe(0)

      }
    )


    /*
     * =============================================
     * VERY SMALL BUDGET
     * =============================================
     */

    it(
      'handles a budget smaller than one monetary unit',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              100,

          }),

        ]


        const budgets = [

          createBudget({

            amount:
              0.01,

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
        ).toBe(0.01)


        expect(
          result[0]
            .shortfall
        ).toBe(99.99)

      }
    )


    /*
     * =============================================
     * SAME MONTH START AND DEADLINE
     * =============================================
     */

    it(
      'handles a goal whose start and deadline are in the same month',
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
            .requiredMonthly
        ).toBeGreaterThan(0)

      }
    )


    /*
     * =============================================
     * MONTHLY PLAN SUM
     * =============================================
     */

    it(
      'does not create monthly allocations exceeding the target',
      () => {

        const goals = [

          createGoal({

            targetAmount:
              1000,

            startDate:
              '2026-08-01',

            deadline:
              '2026-10-01',

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

          createBudget({

            year:
              2026,

            month:
              8,

            amount:
              1000,

          }),

        ]


        const result =
          strategy.allocate(
            goals,
            budgets
          )


        const total =
          result[0]
            .monthlyAllocations
            .reduce(
              (
                sum,
                allocation
              ) =>
                sum +
                allocation.amount,
              0
            )


        expect(
          total
        ).toBeLessThanOrEqual(1000)

      }
    )

  }
)