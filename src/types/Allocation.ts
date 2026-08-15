//
// Represents the amount allocated to a goal
// for a specific month and year.
export interface MonthlyAllocation {

  // Numeric month value (0 = January, 11 = December).
  month: number

  // Year of the allocation.
  year: number

  // Display name of the month.
  monthName: string

  // Amount of money allocated for the month.
  amount: number
}


// Represents one possible allocation plan
// for a savings goal.
export interface AllocationPlan {

  // Indicates whether the plan requires an immediate
  // payment or regular monthly contributions.
  type: 'immediate' | 'monthly'

  // Human-readable explanation of the allocation plan.
  description: string

  // Amount associated with this allocation plan.
  amount: number

  // Indicates whether this plan is the recommended option.
  // Optional because not every plan needs to be recommended.
  recommended?: boolean

  // Monthly allocations included in this plan.
  monthlyAllocations: MonthlyAllocation[]
}


// Represents the complete allocation result
// for one savings goal.
export interface AllocationResult {

  // Unique ID of the savings goal.
  goalId: number

  // Name of the savings goal.
  goalName: string

  // Total amount required to reach the goal.
  targetAmount: number

  // Amount that needs to be saved per month.
  requiredMonthly: number

  // Different allocation plans calculated for the goal.
  allocationPlans: AllocationPlan[]

  // Total amount that has been allocated.
  totalAllocated: number

  // Total amount required for the goal.
  totalRequired: number

  // Amount still missing when the goal cannot be fully funded.
  shortfall: number

  // Percentage of the target amount that can be funded.
  percentage: number

  // Indicates whether the goal can be fully reached.
  reachable: boolean

  // Expected completion date.
  // Null when there is no calculated completion date.
  completionDate: string | null

  // Monthly allocation breakdown for the goal.
  monthlyAllocations: MonthlyAllocation[]
}


/* ================================================= */
/* SYSTEM ALLOCATION */
/* ================================================= */

/**
 * Represents the allocation information for one goal
 * within a system-level allocation result.
 */
export interface SystemGoalAllocation {

  // Unique ID of the savings goal.
  goalId: number

  // Name of the savings goal.
  goalName: string

  // Target amount required by the goal.
  targetAmount: number

  // Total amount allocated to the goal.
  totalAllocated: number

  // Percentage of the target amount that is allocated.
  percentage: number

  // Indicates whether the goal can be fully reached.
  reachable: boolean

  // Monthly allocation breakdown for the goal.
  monthlyAllocations:
    MonthlyAllocation[]
}


/**
 * Represents one complete system-level
 * allocation scenario.
 */
export interface SystemAllocation {

  // Ranking of this allocation scenario.
  rank: number

  // Display title of the allocation scenario.
  title: string

  // Score assigned to the allocation scenario.
  score: number

  // Allocation results for the goals included
  // in this system-level scenario.
  goals:
    SystemGoalAllocation[]
}