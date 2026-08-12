import type { Goal } from '../types/goal'
import type { MonthlyBudget } from '../types/monthlyBudget'
import type {
  AllocationResult,
} from '../types/Allocation'

import type { AllocationStrategy } from './AllocationStrategy'

export function generateAllocation(
  goals: Goal[],
  budgets: MonthlyBudget[],
  strategy: AllocationStrategy
): AllocationResult[] {

  return strategy.allocate(
    goals,
    budgets
  )
}