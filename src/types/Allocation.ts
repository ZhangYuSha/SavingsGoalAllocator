export interface MonthlyAllocation {
  month: number
  year: number
  monthName: string
  amount: number
}

export interface AllocationPlan {
  type: 'immediate' | 'monthly'
  description: string
  amount: number
  recommended?: boolean
  monthlyAllocations: MonthlyAllocation[]
}

export interface AllocationResult {
  goalId: number
  goalName: string

  targetAmount: number

  requiredMonthly: number

  allocationPlans: AllocationPlan[]

  totalAllocated: number
  totalRequired: number

  shortfall: number
  percentage: number

  reachable: boolean

  completionDate: string | null

  monthlyAllocations: MonthlyAllocation[]
}