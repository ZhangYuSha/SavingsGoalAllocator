import type { Goal } from '../types/goal'
import type { MonthlyBudget } from '../types/monthlyBudget'
import type { AllocationResult } from '../types/Allocation'

export interface AllocationStrategy {
  allocate(
    goals: Goal[],
    budgets: MonthlyBudget[]
  ): AllocationResult[]
}