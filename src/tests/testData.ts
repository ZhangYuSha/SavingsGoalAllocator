import type { Goal } from '../types/goal'
import type { MonthlyBudget } from '../types/monthlyBudget'


export function createGoal(
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


export function createBudget(
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