import type { Goal } from "../types/goal";

export interface AllocationResult {
  goalId: number;
  goalName: string;
  targetAmount: number;
  requiredMonthly: number;
  allocatedMonthly: number;
  shortfall: number;
  percentage: number;
  reachable: boolean;
}

export function calculateMonths(
  startDate: string,
  deadline: string
): number {
  const start = new Date(startDate);
  const end = new Date(deadline);

  if (end <= start) {
    return 0;
  }

  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  return Math.max(1, months);
}

export function calculateMonthlySaving(
  targetAmount: number,
  startDate: string,
  deadline: string
): number {
  const months = calculateMonths(startDate, deadline);

  if (months <= 0) {
    return targetAmount;
  }

  return Math.ceil(targetAmount / months);
}

export function generateAllocation(
  goals: Goal[],
  monthlyBudget: number
): AllocationResult[] {
  if (goals.length === 0) {
    return [];
  }

  /*
   * Higher priority gets considered first.
   *
   * Priority 5 = most important
   * Priority 1 = least important
   */

  const sortedGoals = [...goals].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }

    return (
      new Date(a.deadline).getTime() -
      new Date(b.deadline).getTime()
    );
  });

  let remainingBudget = monthlyBudget;

  const results: AllocationResult[] = [];

  for (const goal of sortedGoals) {
    const required = goal.monthlySaving;

    const allocation = Math.min(
      required,
      Math.max(0, remainingBudget)
    );

    remainingBudget -= allocation;

    const shortfall = Math.max(
      0,
      required - allocation
    );

    const percentage =
      required === 0
        ? 100
        : Math.min(
            100,
            Math.round((allocation / required) * 100)
          );

    results.push({
      goalId: goal.id,
      goalName: goal.name,
      targetAmount: goal.targetAmount,
      requiredMonthly: required,
      allocatedMonthly: allocation,
      shortfall,
      percentage,
      reachable: allocation >= required,
    });
  }

  return results;
}