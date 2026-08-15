import type { Goal } from '../types/goal'
import type { MonthlyBudget } from '../types/monthlyBudget'
import type {
  AllocationResult,
  MonthlyAllocation,
  AllocationPlan,
} from '../types/Allocation'

import type { AllocationStrategy } from './AllocationStrategy'

import { calculateMonthlySaving } from './goalCalculator'
import { formatMonthYear } from './dateUtils'
import {
  roundMoney,
  combineBudgetsByMonth,
  findAllocationTimeline,
} from './allocationUtils'

export class PriorityAllocationStrategy implements AllocationStrategy {
  allocate(goals: Goal[], budgets: MonthlyBudget[]): AllocationResult[] {
    if (goals.length === 0) {
      return []
    }

    // ---------------------------------------------
    // TRACKING
    // ---------------------------------------------

    const allocatedByGoal = new Map<number, number>()
    const monthlyAllocationsByGoal = new Map<number, MonthlyAllocation[]>()
    const completionDates = new Map<number, string | null>()

    for (const goal of goals) {
      allocatedByGoal.set(goal.id, 0)
      monthlyAllocationsByGoal.set(goal.id, [])
      completionDates.set(goal.id, null)
    }

    const budgetMap = combineBudgetsByMonth(budgets)

    const timeline = findAllocationTimeline(goals, budgets)

    if (timeline === null) {
      return []
    }

    const current = new Date(timeline.earliest)
    const latestDeadline = timeline.latestDeadline

    // ---------------------------------------------
    // PROCESS EVERY CALENDAR MONTH
    // ---------------------------------------------
    //
    // This is the real allocation: money is shared across all
    // active goals, highest priority first, with leftover cash
    // carried into the next month. This is the single source of
    // truth for what each goal actually receives — the plan
    // shown to the user below is derived from these results,
    // not recomputed separately, so the two can never disagree.

    let carryForward = 0

    while (current <= latestDeadline) {
      const month = current.getMonth()
      const year = current.getFullYear()
      const key = `${year}-${month}`

      const newBudget = budgetMap.get(key) ?? 0

      let availableBudget = carryForward + newBudget

      const activeGoals = goals
        .filter(goal => {
          const start = new Date(goal.startDate)
          const deadline = new Date(goal.deadline)

          const currentMonth = new Date(year, month, 1)
          const startMonth = new Date(start.getFullYear(), start.getMonth(), 1)
          const deadlineMonth = new Date(deadline.getFullYear(), deadline.getMonth(), 1)

          const alreadyAllocated = allocatedByGoal.get(goal.id) ?? 0

          return (
            currentMonth >= startMonth &&
            currentMonth <= deadlineMonth &&
            alreadyAllocated < goal.targetAmount
          )
        })
        // Higher priority first. If priority is equal, earlier deadline first.
        .sort((a, b) => {
          if (b.priority !== a.priority) {
            return b.priority - a.priority
          }
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        })

      for (const goal of activeGoals) {
        if (availableBudget <= 0) {
          break
        }

        const alreadyAllocated = allocatedByGoal.get(goal.id) ?? 0
        const remaining = Math.max(0, goal.targetAmount - alreadyAllocated)

        if (remaining <= 0) {
          continue
        }

        const allocation = Math.min(availableBudget, remaining)

        if (allocation <= 0) {
          continue
        }

        addAllocation(
          goal,
          allocation,
          month,
          year,
          allocatedByGoal,
          monthlyAllocationsByGoal,
          completionDates
        )

        availableBudget = roundMoney(availableBudget - allocation)
      }

      carryForward = availableBudget
      current.setMonth(current.getMonth() + 1)
    }

    // ---------------------------------------------
    // CREATE FINAL RESULTS
    // ---------------------------------------------

    return goals.map(goal => {
      const totalAllocated = allocatedByGoal.get(goal.id) ?? 0

      const requiredMonthly = calculateMonthlySaving(
        goal.targetAmount,
        goal.startDate,
        goal.deadline
      )

      const actualAllocations = monthlyAllocationsByGoal.get(goal.id) ?? []

      // ---------------------------------------------
      // PLAN — derived directly from the real allocation above.
      //
      // Previously this projected a hypothetical "fund
      // immediately" and "spread monthly" option per goal,
      // computed independently of other goals. That let two
      // goals both claim the same month's budget and show
      // "Recommended" at the same time, contradicting the
      // reachable/shortfall status below. Since the real loop
      // above already knows exactly what each goal receives and
      // when, the plan just reports that — so it can never
      // disagree with the reachability status.
      // ---------------------------------------------

      const allocationPlans: AllocationPlan[] = []

      if (actualAllocations.length > 0) {
        const isSingleMonth = actualAllocations.length === 1
        const first = actualAllocations[0]
        const last = actualAllocations[actualAllocations.length - 1]

        allocationPlans.push({
          type: isSingleMonth ? 'immediate' : 'monthly',
          description: isSingleMonth
            ? `RM ${first.amount} in ${first.monthName}`
            : `RM ${first.amount} / month from ${first.monthName} to ${last.monthName}`,
          amount: totalAllocated,
          recommended: true,
          monthlyAllocations: actualAllocations,
        })
      }

      const shortfall = Math.max(0, goal.targetAmount - totalAllocated)

      const percentage =
        goal.targetAmount === 0
          ? 100
          : Math.min(100, Math.round((totalAllocated / goal.targetAmount) * 100))

      return {
        goalId: goal.id,
        goalName: goal.name,
        targetAmount: goal.targetAmount,
        requiredMonthly,
        allocationPlans,
        totalAllocated,
        totalRequired: goal.targetAmount,
        shortfall,
        percentage,
        reachable: totalAllocated >= goal.targetAmount,
        completionDate: completionDates.get(goal.id) ?? null,
        monthlyAllocations: actualAllocations,
      }
    })
  }
}

// =================================================
// HELPERS
// =================================================

function addAllocation(
  goal: Goal,
  amount: number,
  month: number,
  year: number,
  allocatedByGoal: Map<number, number>,
  monthlyAllocationsByGoal: Map<number, MonthlyAllocation[]>,
  completionDates: Map<number, string | null>
): void {
  const previous = allocatedByGoal.get(goal.id) ?? 0
  const newTotal = roundMoney(previous + amount)

  allocatedByGoal.set(goal.id, newTotal)

  const allocations = monthlyAllocationsByGoal.get(goal.id) ?? []

  const existing = allocations.find(
    allocation => allocation.month === month && allocation.year === year
  )

  if (existing) {
    existing.amount = roundMoney(existing.amount + amount)
  } else {
    allocations.push({
      month,
      year,
      monthName: formatMonthYear(month, year),
      amount: roundMoney(amount),
    })
  }

  monthlyAllocationsByGoal.set(goal.id, allocations)

  // Record the first month in which the goal becomes fully funded.
  if (newTotal >= goal.targetAmount && completionDates.get(goal.id) === null) {
    completionDates.set(goal.id, formatMonthYear(month, year))
  }
}