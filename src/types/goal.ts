export interface Goal {
  id: number;
  name: string;
  targetAmount: number;
  startDate: string;
  deadline: string;
  priority: number;
}

export interface GoalAllocation {
  goalId: number;
  goalName: string;
  month: string;
  allocation: number;
  required: number;
}

export interface GoalResult {
  goalId: number;
  goalName: string;
  targetAmount: number;
  allocatedAmount: number;
  remainingAmount: number;
  progress: number;
  requiredMonthly: number;
  reachable: boolean;
  deadline: string;
  priority: number;
}

export interface AllocationResult {
  monthlyAllocations: GoalAllocation[];
  goalResults: GoalResult[];
  totalAllocated: number;
  totalAvailable: number;
}