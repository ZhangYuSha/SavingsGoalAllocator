import type { Goal } from '../types/goal'
import type { MonthlyBudget } from '../types/monthlyBudget'
import type {
  AllocationResult,
} from '../types/Allocation'

import type { AllocationStrategy } from './AllocationStrategy'


/**
 * Generates a savings allocation plan using the
 * selected allocation strategy.
 *
 * The function delegates the actual allocation logic
 * to the provided strategy, allowing different
 * allocation algorithms to be used without changing
 * this function.
 *
 * @param goals - Savings goals that need to be allocated.
 * @param budgets - Available monthly spare-cash budgets.
 * @param strategy - Allocation strategy used to determine
 * how the available budget is distributed among the goals.
 * @returns The allocation results produced by the selected strategy.
 */
export function generateAllocation(
  goals: Goal[],
  budgets: MonthlyBudget[],
  strategy: AllocationStrategy
): AllocationResult[] {


  /*
   * Delegate the allocation calculation to the selected
   * strategy.
   *
   * The strategy is responsible for deciding how the
   * budgets should be distributed across the goals.
   */
  return strategy.allocate(
    goals,
    budgets
  )
}