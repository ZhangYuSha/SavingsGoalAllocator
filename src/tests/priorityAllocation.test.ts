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
  'PriorityAllocationStrategy',
  () => {

    const strategy =
      new PriorityAllocationStrategy()


    // =================================================
    // 1. EMPTY INPUT
    // =================================================

    it(
      'returns an empty result when there are no goals',
      () => {

        const result =
          strategy.allocate(
            [],
            []
          )

        expect(result).toEqual([])

      }
    )


    // =================================================
    // 2. NO GOALS WITH BUDGET
    // =================================================

    it(
      'returns an empty result when there are no goals but there is budget',
      () => {

        const budgets = [

          createBudget({
            amount: 500,
          }),

        ]

        const result =
          strategy.allocate(
            [],
            budgets
          )

        expect(result).toEqual([])

      }
    )


    // =================================================
    // 3. NO BUDGET
    // =================================================

    it(
      'marks a goal unreachable when there is no budget',
      () => {

        const goals = [

          createGoal({
            targetAmount: 500,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            []
          )

        expect(
          result[0].totalAllocated
        ).toBe(0)

        expect(
          result[0].shortfall
        ).toBe(500)

        expect(
          result[0].reachable
        ).toBe(false)

      }
    )


    // =================================================
    // 4. ZERO BUDGET
    // =================================================

    it(
      'does not allocate a zero budget',
      () => {

        const goals = [

          createGoal({
            targetAmount: 500,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 0,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].totalAllocated
        ).toBe(0)

        expect(
          result[0]
            .monthlyAllocations.length
        ).toBe(0)

      }
    )


    // =================================================
    // 5. ZERO TARGET
    // =================================================

    it(
      'handles a zero target',
      () => {

        const goals = [

          createGoal({
            targetAmount: 0,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 500,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].totalAllocated
        ).toBe(0)

        expect(
          result[0].shortfall
        ).toBe(0)

        expect(
          result[0].percentage
        ).toBe(100)

        expect(
          result[0].reachable
        ).toBe(true)

      }
    )


    // =================================================
    // 6. EXACT FUNDING
    // =================================================

    it(
      'fully funds a goal when budget exactly matches target',
      () => {

        const goals = [

          createGoal({
            targetAmount: 500,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 500,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].totalAllocated
        ).toBe(500)

        expect(
          result[0].shortfall
        ).toBe(0)

        expect(
          result[0].percentage
        ).toBe(100)

        expect(
          result[0].reachable
        ).toBe(true)

      }
    )


    // =================================================
    // 7. BUDGET GREATER THAN TARGET
    // =================================================

    it(
      'does not allocate more than the target',
      () => {

        const goals = [

          createGoal({
            targetAmount: 500,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 1000,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].totalAllocated
        ).toBe(500)

      }
    )


    // =================================================
    // 8. PARTIAL FUNDING
    // =================================================

    it(
      'records the correct shortfall for partial funding',
      () => {

        const goals = [

          createGoal({
            targetAmount: 1000,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 400,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].totalAllocated
        ).toBe(400)

        expect(
          result[0].shortfall
        ).toBe(600)

        expect(
          result[0].percentage
        ).toBe(40)

        expect(
          result[0].reachable
        ).toBe(false)

      }
    )


    // =================================================
    // 9. DECIMAL VALUES
    // =================================================

    it(
      'handles decimal monetary values',
      () => {

        const goals = [

          createGoal({
            targetAmount: 100.01,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 100.01,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].totalAllocated
        ).toBe(100.01)

        expect(
          result[0].shortfall
        ).toBe(0)

      }
    )


    // =================================================
    // 10. VERY SMALL BUDGET
    // =================================================

    it(
      'handles a budget smaller than one monetary unit',
      () => {

        const goals = [

          createGoal({
            targetAmount: 100,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 0.01,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].totalAllocated
        ).toBe(0.01)

        expect(
          result[0].shortfall
        ).toBe(99.99)

      }
    )


    // =================================================
    // 11. HIGH PRIORITY GETS LIMITED BUDGET
    // =================================================

    it(
      'gives limited budget to the highest-priority goal first',
      () => {

        const goals = [

          createGoal({
            id: 1,
            targetAmount: 500,
            priority: 10,
          }),

          createGoal({
            id: 2,
            targetAmount: 500,
            priority: 1,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 500,
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
        ).toBe(500)

        expect(
          low?.totalAllocated
        ).toBe(0)

      }
    )


    // =================================================
    // 12. HIGH PRIORITY FULL THEN LOW
    // =================================================

    it(
      'fully funds the high-priority goal before the lower-priority goal',
      () => {

        const goals = [

          createGoal({
            id: 1,
            targetAmount: 300,
            priority: 10,
          }),

          createGoal({
            id: 2,
            targetAmount: 500,
            priority: 5,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 500,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result.find(
            goal =>
              goal.goalId === 1
          )?.totalAllocated
        ).toBe(300)

        expect(
          result.find(
            goal =>
              goal.goalId === 2
          )?.totalAllocated
        ).toBe(200)

      }
    )


    // =================================================
    // 13. THREE PRIORITIES
    // =================================================

    it(
      'allocates three goals strictly by priority',
      () => {

        const goals = [

          createGoal({
            id: 1,
            targetAmount: 300,
            priority: 10,
          }),

          createGoal({
            id: 2,
            targetAmount: 300,
            priority: 5,
          }),

          createGoal({
            id: 3,
            targetAmount: 300,
            priority: 1,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 500,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result.find(
            goal =>
              goal.goalId === 1
          )?.totalAllocated
        ).toBe(300)

        expect(
          result.find(
            goal =>
              goal.goalId === 2
          )?.totalAllocated
        ).toBe(200)

        expect(
          result.find(
            goal =>
              goal.goalId === 3
          )?.totalAllocated
        ).toBe(0)

      }
    )


    // =================================================
    // 14. PRIORITY AFTER TARGET
    // =================================================

    it(
      'moves to the next priority after the first goal reaches its target',
      () => {

        const goals = [

          createGoal({
            id: 1,
            targetAmount: 200,
            priority: 10,
          }),

          createGoal({
            id: 2,
            targetAmount: 500,
            priority: 5,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 700,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result.find(
            goal =>
              goal.goalId === 1
          )?.totalAllocated
        ).toBe(200)

        expect(
          result.find(
            goal =>
              goal.goalId === 2
          )?.totalAllocated
        ).toBe(500)

      }
    )


    // =================================================
    // 15. EQUAL PRIORITY
    // =================================================

    it(
      'uses earlier deadline when priorities are equal',
      () => {

        const goals = [

          createGoal({
            id: 1,
            targetAmount: 500,
            priority: 5,
            deadline: '2026-08-01',
          }),

          createGoal({
            id: 2,
            targetAmount: 500,
            priority: 5,
            deadline: '2026-10-01',
          }),

        ]

        const budgets = [

          createBudget({
            amount: 500,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result.find(
            goal =>
              goal.goalId === 1
          )?.totalAllocated
        ).toBe(500)

        expect(
          result.find(
            goal =>
              goal.goalId === 2
          )?.totalAllocated
        ).toBe(0)

      }
    )


    // =================================================
    // 16. LOW PRIORITY DOES NOT RECEIVE MONEY FIRST
    // =================================================

    it(
      'does not allocate to a lower-priority goal while higher priority remains unfunded',
      () => {

        const goals = [

          createGoal({
            id: 1,
            targetAmount: 1000,
            priority: 10,
          }),

          createGoal({
            id: 2,
            targetAmount: 1000,
            priority: 1,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 300,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result.find(
            goal =>
              goal.goalId === 1
          )?.totalAllocated
        ).toBe(300)

        expect(
          result.find(
            goal =>
              goal.goalId === 2
          )?.totalAllocated
        ).toBe(0)

      }
    )


    // =================================================
    // 17. GOAL NOT ACTIVE YET
    // =================================================

    it(
      'carries budget forward when the goal has not started yet',
      () => {

        const goals = [

          createGoal({
            targetAmount: 500,
            startDate: '2026-09-01',
            deadline: '2026-10-01',
          }),

        ]

        const budgets = [

          createBudget({
            year: 2026,
            month: 7,
            amount: 500,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].totalAllocated
        ).toBe(500)

      }
    )


    // =================================================
    // 18. CARRY FORWARD
    // =================================================

    it(
      'carries unused money until the goal becomes active',
      () => {

        const goals = [

          createGoal({
            targetAmount: 500,
            startDate: '2026-09-01',
            deadline: '2026-09-01',
          }),

        ]

        const budgets = [

          createBudget({
            year: 2026,
            month: 7,
            amount: 200,
          }),

          createBudget({
            year: 2026,
            month: 8,
            amount: 300,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].totalAllocated
        ).toBe(500)

      }
    )


    // =================================================
    // 19. BUDGET AFTER DEADLINE
    // =================================================

    it(
      'does not use budget after the deadline',
      () => {

        const goals = [

          createGoal({
            targetAmount: 500,
            startDate: '2026-08-01',
            deadline: '2026-08-31',
          }),

        ]

        const budgets = [

          createBudget({
            year: 2026,
            month: 8,
            amount: 0,
          }),

          createBudget({
            year: 2026,
            month: 9,
            amount: 500,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].totalAllocated
        ).toBe(0)

      }
    )


    // =================================================
    // 20. DEADLINE MONTH
    // =================================================

    it(
      'allocates budget in the deadline month',
      () => {

        const goals = [

          createGoal({
            targetAmount: 500,
            startDate: '2026-08-01',
            deadline: '2026-08-31',
          }),

        ]

        const budgets = [

          createBudget({
            year: 2026,
            month: 7,
            amount: 500,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].totalAllocated
        ).toBe(500)

      }
    )


    // =================================================
    // 21. MULTIPLE MONTHS
    // =================================================

    it(
      'allocates across multiple months',
      () => {

        const goals = [

          createGoal({
            targetAmount: 600,
            startDate: '2026-07-01',
            deadline: '2026-09-01',
          }),

        ]

        const budgets = [

          createBudget({
            year: 2026,
            month: 6,
            amount: 200,
          }),

          createBudget({
            year: 2026,
            month: 7,
            amount: 200,
          }),

          createBudget({
            year: 2026,
            month: 8,
            amount: 200,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].totalAllocated
        ).toBe(600)

      }
    )


    // =================================================
    // 22. SAME MONTH START/DEADLINE
    // =================================================

    it(
      'handles a goal with start and deadline in the same month',
      () => {

        const goals = [

          createGoal({
            targetAmount: 500,
            startDate: '2026-08-01',
            deadline: '2026-08-31',
          }),

        ]

        const budgets = [

          createBudget({
            year: 2026,
            month: 7,
            amount: 500,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].requiredMonthly
        ).toBeGreaterThan(0)

      }
    )


    // =================================================
    // 23. COMPLETION DATE
    // =================================================

    it(
      'records a completion date',
      () => {

        const goals = [

          createGoal({
            targetAmount: 500,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 500,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].completionDate
        ).not.toBeNull()

      }
    )


    // =================================================
    // 24. COMPLETION MONTH
    // =================================================

    it(
      'records the correct completion month',
      () => {

        const goals = [

          createGoal({
            targetAmount: 500,
            startDate: '2026-08-01',
            deadline: '2026-08-31',
          }),

        ]

        const budgets = [

          createBudget({
            year: 2026,
            month: 7,
            amount: 500,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].completionDate
        ).toBe('August 2026')

      }
    )


    // =================================================
    // 25. MONTHLY ALLOCATION MERGING
    // =================================================

    it(
      'does not create duplicate monthly allocation rows',
      () => {

        const goals = [

          createGoal({
            targetAmount: 500,
          }),

        ]

        const budgets = [

          createBudget({
            year: 2026,
            month: 7,
            amount: 200,
          }),

          createBudget({
            year: 2026,
            month: 7,
            amount: 300,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0]
            .monthlyAllocations.length
        ).toBe(1)

        expect(
          result[0]
            .monthlyAllocations[0]
            .amount
        ).toBe(500)

      }
    )


    // =================================================
    // 26. MULTIPLE BUDGETS SAME MONTH
    // =================================================

    it(
      'combines multiple budgets from the same month',
      () => {

        const goals = [

          createGoal({
            targetAmount: 500,
          }),

        ]

        const budgets = [

          createBudget({
            year: 2026,
            month: 7,
            amount: 100,
          }),

          createBudget({
            year: 2026,
            month: 7,
            amount: 150,
          }),

          createBudget({
            year: 2026,
            month: 7,
            amount: 250,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].totalAllocated
        ).toBe(500)

      }
    )


    // =================================================
    // 27. PERCENTAGE
    // =================================================

    it(
      'calculates percentage correctly',
      () => {

        const goals = [

          createGoal({
            targetAmount: 800,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 200,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].percentage
        ).toBe(25)

      }
    )


    // =================================================
    // 28. SHORTFALL
    // =================================================

    it(
      'calculates shortfall correctly',
      () => {

        const goals = [

          createGoal({
            targetAmount: 1000,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 650,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].shortfall
        ).toBe(350)

      }
    )


    // =================================================
    // 29. TOTAL BUDGET CONSTRAINT
    // =================================================

    it(
      'never allocates more than total available budget',
      () => {

        const goals = [

          createGoal({
            id: 1,
            targetAmount: 1000,
            priority: 10,
          }),

          createGoal({
            id: 2,
            targetAmount: 1000,
            priority: 5,
          }),

          createGoal({
            id: 3,
            targetAmount: 1000,
            priority: 1,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 750,
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

        expect(total).toBe(750)

      }
    )


    // =================================================
    // 30. TARGET LIMIT
    // =================================================

    it(
      'never allocates more than a goal target',
      () => {

        const goals = [

          createGoal({
            id: 1,
            targetAmount: 300,
            priority: 10,
          }),

          createGoal({
            id: 2,
            targetAmount: 300,
            priority: 5,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 1000,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].totalAllocated
        ).toBeLessThanOrEqual(300)

        expect(
          result[1].totalAllocated
        ).toBeLessThanOrEqual(300)

      }
    )


    // =================================================
    // 31. HIGH PRIORITY INACTIVE
    // =================================================

    it(
      'allows an active lower-priority goal to receive money when a higher-priority goal has not started',
      () => {

        const goals = [

          createGoal({
            id: 1,
            targetAmount: 500,
            priority: 10,
            startDate: '2026-09-01',
            deadline: '2026-10-01',
          }),

          createGoal({
            id: 2,
            targetAmount: 500,
            priority: 5,
            startDate: '2026-08-01',
            deadline: '2026-10-01',
          }),

        ]

        const budgets = [

          createBudget({
            year: 2026,
            month: 7,
            amount: 500,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result.find(
            goal =>
              goal.goalId === 2
          )?.totalAllocated
        ).toBe(500)

      }
    )


    // =================================================
    // 32. HIGH PRIORITY DEADLINE PASSED
    // =================================================

    it(
      'does not allocate to a high-priority goal after its deadline',
      () => {

        const goals = [

          createGoal({
            id: 1,
            targetAmount: 500,
            priority: 10,
            startDate: '2026-07-01',
            deadline: '2026-07-31',
          }),

          createGoal({
            id: 2,
            targetAmount: 500,
            priority: 5,
            startDate: '2026-08-01',
            deadline: '2026-08-31',
          }),

        ]

        const budgets = [

          createBudget({
            year: 2026,
            month: 7,
            amount: 500,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result.find(
            goal =>
              goal.goalId === 1
          )?.totalAllocated
        ).toBe(0)

        expect(
          result.find(
            goal =>
              goal.goalId === 2
          )?.totalAllocated
        ).toBe(500)

      }
    )


    // =================================================
    // 33. PRIORITY 0
    // =================================================

    it(
      'handles priority zero',
      () => {

        const goals = [

          createGoal({
            id: 1,
            targetAmount: 500,
            priority: 0,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 500,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].totalAllocated
        ).toBe(500)

      }
    )


    // =================================================
    // 34. NEGATIVE PRIORITY
    // =================================================

    it(
      'still allocates to a goal with negative priority when it is the only goal',
      () => {

        const goals = [

          createGoal({
            targetAmount: 500,
            priority: -1,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 500,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].totalAllocated
        ).toBe(500)

      }
    )


    // =================================================
    // 35. NEGATIVE BUDGET
    // =================================================

    it(
      'does not allocate a negative budget',
      () => {

        const goals = [

          createGoal({
            targetAmount: 500,
          }),

        ]

        const budgets = [

          createBudget({
            amount: -100,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].totalAllocated
        ).toBe(0)

      }
    )


    // =================================================
    // 36. TARGET REACHED EARLY
    // =================================================

    it(
      'stops allocating to a goal once its target is reached',
      () => {

        const goals = [

          createGoal({
            targetAmount: 300,
            startDate: '2026-07-01',
            deadline: '2026-09-01',
          }),

        ]

        const budgets = [

          createBudget({
            year: 2026,
            month: 6,
            amount: 300,
          }),

          createBudget({
            year: 2026,
            month: 7,
            amount: 300,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].totalAllocated
        ).toBe(300)

      }
    )


    // =================================================
// 37. MONTHLY PLAN EXISTS
// =================================================

it(
  'creates a monthly plan for a multi-month goal',
  () => {

    const goals = [

      createGoal({
        targetAmount: 800,
        startDate: '2026-08-01',
        deadline: '2026-09-01',
      }),

    ]

    const budgets = [

      createBudget({
        year: 2026,
        month: 7,
        amount: 800,
      }),

      createBudget({
        year: 2026,
        month: 8,
        amount: 400,
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
            plan.type === 'monthly'
        )

    expect(
      monthly
    ).toBeDefined()

  }
)


    // =================================================
    // 38. SAME MONTH NO MONTHLY PLAN
    // =================================================

    it(
      'does not create a monthly plan for a one-month goal',
      () => {

        const goals = [

          createGoal({
            targetAmount: 500,
            startDate: '2026-08-01',
            deadline: '2026-08-31',
          }),

        ]

        const budgets = [

          createBudget({
            amount: 500,
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
                plan.type === 'monthly'
            )

        expect(
          monthly
        ).toBeUndefined()

      }
    )


    // =================================================
    // 39. IMMEDIATE PLAN
    // =================================================

    it(
      'creates an immediate plan when enough money exists',
      () => {

        const goals = [

          createGoal({
            targetAmount: 200,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 200,
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
                plan.type === 'immediate'
            )

        expect(
          immediate
        ).toBeDefined()

        expect(
          immediate?.amount
        ).toBe(200)

      }
    )


    // =================================================
// 40. IMMEDIATE PLAN WITH INSUFFICIENT MONEY
// =================================================

it(
  'creates an immediate plan with the available money when insufficient money exists',
  () => {

    const goals = [

      createGoal({
        targetAmount: 1000,
      }),

    ]

    const budgets = [

      createBudget({
        amount: 500,
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
            plan.type === 'immediate'
        )

    expect(
      immediate
    ).toBeDefined()

    expect(
      immediate?.amount
    ).toBe(500)

  }
)


    // =================================================
    // 41. IMMEDIATE PLAN RECOMMENDED
    // =================================================

    it(
      'marks the immediate plan as recommended',
      () => {

        const goals = [

          createGoal({
            targetAmount: 200,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 200,
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
                plan.type === 'immediate'
            )

        expect(
          immediate?.recommended
        ).toBe(true)

      }
    )


    // =================================================
// 42. MULTI-MONTH PLAN HAS MULTIPLE ALLOCATIONS
// =================================================

it(
  'creates multiple monthly allocations for a multi-month goal',
  () => {

    const goals = [

      createGoal({
        targetAmount: 900,
        startDate: '2026-08-01',
        deadline: '2026-10-01',
      }),

    ]

    const budgets = [

      createBudget({
        year: 2026,
        month: 7,
        amount: 900,
      }),

      createBudget({
        year: 2026,
        month: 8,
        amount: 400,
      }),

      createBudget({
        year: 2026,
        month: 9,
        amount: 400,
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
            plan.type === 'monthly'
        )

    expect(
      monthly
    ).toBeDefined()

    expect(
      monthly
        ?.monthlyAllocations.length
    ).toBe(3)

  }
)


    // =================================================
    // 43. MONTHLY PLAN DOES NOT EXCEED TARGET
    // =================================================

    it(
      'does not create monthly allocations exceeding the target',
      () => {

        const goals = [

          createGoal({
            targetAmount: 1000,
            startDate: '2026-08-01',
            deadline: '2026-10-01',
          }),

        ]

        const budgets = [

          createBudget({
            amount: 2000,
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
                plan.type === 'monthly'
            )

        const total =
          monthly
            ?.monthlyAllocations
            .reduce(
              (
                sum,
                allocation
              ) =>
                sum +
                allocation.amount,
              0
            ) ?? 0

        expect(
          total
        ).toBeLessThanOrEqual(1000)

      }
    )


    // =================================================
    // 44. ALLOCATION MONTH NAME
    // =================================================

    it(
      'stores the correct month name',
      () => {

        const goals = [

          createGoal({
            targetAmount: 500,
            startDate: '2026-08-01',
            deadline: '2026-08-31',
          }),

        ]

        const budgets = [

          createBudget({
            year: 2026,
            month: 7,
            amount: 500,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0]
            .monthlyAllocations[0]
            .monthName
        ).toBe('August 2026')

      }
    )


    // =================================================
    // 45. PRIORITY ACROSS MULTIPLE MONTHS
    // =================================================

    it(
      'maintains priority across multiple months',
      () => {

        const goals = [

          createGoal({
            id: 1,
            targetAmount: 1000,
            priority: 10,
            startDate: '2026-07-01',
            deadline: '2026-09-01',
          }),

          createGoal({
            id: 2,
            targetAmount: 1000,
            priority: 1,
            startDate: '2026-07-01',
            deadline: '2026-09-01',
          }),

        ]

        const budgets = [

          createBudget({
            year: 2026,
            month: 6,
            amount: 400,
          }),

          createBudget({
            year: 2026,
            month: 7,
            amount: 400,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result.find(
            goal =>
              goal.goalId === 1
          )?.totalAllocated
        ).toBe(800)

        expect(
          result.find(
            goal =>
              goal.goalId === 2
          )?.totalAllocated
        ).toBe(0)

      }
    )


    // =================================================
    // 46. PRIORITY CHANGES AFTER TARGET COMPLETION
    // =================================================

    it(
      'allocates to the next priority after the first goal is completed across months',
      () => {

        const goals = [

          createGoal({
            id: 1,
            targetAmount: 400,
            priority: 10,
            startDate: '2026-07-01',
            deadline: '2026-09-01',
          }),

          createGoal({
            id: 2,
            targetAmount: 400,
            priority: 5,
            startDate: '2026-07-01',
            deadline: '2026-09-01',
          }),

        ]

        const budgets = [

          createBudget({
            year: 2026,
            month: 6,
            amount: 400,
          }),

          createBudget({
            year: 2026,
            month: 7,
            amount: 400,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result.find(
            goal =>
              goal.goalId === 1
          )?.totalAllocated
        ).toBe(400)

        expect(
          result.find(
            goal =>
              goal.goalId === 2
          )?.totalAllocated
        ).toBe(400)

      }
    )


    // =================================================
    // 47. TOTAL ALLOCATIONS MATCH TOTAL GOAL FUNDING
    // =================================================

    it(
      'keeps total allocated money consistent across goals',
      () => {

        const goals = [

          createGoal({
            id: 1,
            targetAmount: 500,
            priority: 10,
          }),

          createGoal({
            id: 2,
            targetAmount: 500,
            priority: 5,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 750,
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

        expect(total).toBe(750)

      }
    )


    // =================================================
    // 48. REACHABLE TRUE
    // =================================================

    it(
      'marks a fully funded goal as reachable',
      () => {

        const goals = [

          createGoal({
            targetAmount: 500,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 500,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].reachable
        ).toBe(true)

      }
    )


    // =================================================
    // 49. REACHABLE FALSE
    // =================================================

    it(
      'marks an incompletely funded goal as unreachable',
      () => {

        const goals = [

          createGoal({
            targetAmount: 500,
          }),

        ]

        const budgets = [

          createBudget({
            amount: 499,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        expect(
          result[0].reachable
        ).toBe(false)

      }
    )


    // =================================================
    // 50. EXACT PRIORITY SCENARIO
    // =================================================

    it(
      'prioritizes the highest-priority goal exactly as expected',
      () => {

        const goals = [

          createGoal({
            id: 1,
            targetAmount: 1000,
            priority: 10,
            startDate: '2026-08-13',
            deadline: '2026-08-29',
          }),

          createGoal({
            id: 2,
            targetAmount: 1000,
            priority: 1,
            startDate: '2026-08-13',
            deadline: '2026-08-29',
          }),

        ]

        const budgets = [

          createBudget({
            year: 2026,
            month: 7,
            amount: 1000,
          }),

        ]

        const result =
          strategy.allocate(
            goals,
            budgets
          )

        const highPriority =
          result.find(
            goal =>
              goal.goalId === 1
          )

        const lowPriority =
          result.find(
            goal =>
              goal.goalId === 2
          )

        expect(
          highPriority?.totalAllocated
        ).toBe(1000)

        expect(
          lowPriority?.totalAllocated
        ).toBe(0)

        expect(
          highPriority?.reachable
        ).toBe(true)

        expect(
          lowPriority?.reachable
        ).toBe(false)

      }
    )

  }
)