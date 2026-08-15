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

type SpendingStyle = 'immediate' | 'spread'

interface EngineResult {
  allocatedByGoal: Map<number, number>
  monthlyAllocationsByGoal: Map<number, MonthlyAllocation[]>
  completionDates: Map<number, string | null>
}

export class PriorityAllocationStrategy implements AllocationStrategy {
  allocate(goals: Goal[], budgets: MonthlyBudget[]): AllocationResult[] {
    if (goals.length === 0) {
      return []
    }

    const budgetMap = combineBudgetsByMonth(budgets)
    const timeline = findAllocationTimeline(goals, budgets)

    if (timeline === null) {
      return []
    }

    // ---------------------------------------------
    // RUN THE REAL ENGINE TWICE, TWO SPENDING STYLES
    // ---------------------------------------------
    //
    // Both runs walk the SAME shared monthly budget, in the SAME
    // priority order — the only difference is how much of the
    // available money each goal claims in a given month:
    //
    // "immediate" — a goal grabs as much as it can, as soon as
    //   it can (this is the source of truth for totalAllocated /
    //   reachable / shortfall).
    //
    // "spread"    — a goal only claims its fair share for that
    //   month (target divided across its remaining eligible
    //   months), leaving the rest for lower-priority goals to
    //   use sooner. Still bounded by what's actually left in the
    //   shared pool that month, so it can never claim money
    //   another goal already used.
    //
    // Because both runs share one real budget pool, neither can
    // invent money — unlike the old per-goal projection, which
    // computed each goal's plan in isolation.

    const primary = runEngine(goals, budgetMap, timeline, 'immediate')
    const alternative = runEngine(goals, budgetMap, timeline, 'spread')

    // ---------------------------------------------
    // BUILD RESULTS
    // ---------------------------------------------

    return goals.map(goal => {
      const totalAllocated = primary.allocatedByGoal.get(goal.id) ?? 0
      const primaryAllocations = primary.monthlyAllocationsByGoal.get(goal.id) ?? []
      const alternativeAllocations = alternative.monthlyAllocationsByGoal.get(goal.id) ?? []
      const alternativeTotal = alternative.allocatedByGoal.get(goal.id) ?? 0

      const requiredMonthly = calculateMonthlySaving(
        goal.targetAmount,
        goal.startDate,
        goal.deadline
      )

      const allocationPlans: AllocationPlan[] = []

      if (primaryAllocations.length > 0) {
        allocationPlans.push(
          buildPlan('immediate', primaryAllocations, totalAllocated, true)
        )
      }

      // Only offer the spread option if it actually plays out
      // differently for this goal — otherwise it's just the same
      // schedule shown twice.
      if (
        alternativeAllocations.length > 0 &&
        !sameSchedule(primaryAllocations, alternativeAllocations)
      ) {
        allocationPlans.push(
          buildPlan('spread', alternativeAllocations, alternativeTotal, false)
        )
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
        completionDate: primary.completionDates.get(goal.id) ?? null,
        monthlyAllocations: primaryAllocations,
      }
    })
  }
}

// =================================================
// ENGINE — shared budget, walked month by month
// =================================================

function runEngine(
  goals: Goal[],
  budgetMap: Map<string, number>,
  timeline: { earliest: Date; latestDeadline: Date },
  style: SpendingStyle
): EngineResult {
  const allocatedByGoal = new Map<number, number>()
  const monthlyAllocationsByGoal = new Map<number, MonthlyAllocation[]>()
  const completionDates = new Map<number, string | null>()

  for (const goal of goals) {
    allocatedByGoal.set(goal.id, 0)
    monthlyAllocationsByGoal.set(goal.id, [])
    completionDates.set(goal.id, null)
  }

  const current = new Date(timeline.earliest)
  const latestDeadline = timeline.latestDeadline

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
      // Higher priority goals still get first crack at the
      // month's money in both styles — only HOW MUCH each one
      // takes differs.
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

      const claim = calculateClaim(goal, remaining, year, month, style)
      const allocation = Math.min(availableBudget, remaining, claim)

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

  return { allocatedByGoal, monthlyAllocationsByGoal, completionDates }
}

// =================================================
// CALCULATE CLAIM — how much a goal asks for this month
// =================================================

function calculateClaim(
  goal: Goal,
  remaining: number,
  year: number,
  month: number,
  style: SpendingStyle
): number {
  // IMMEDIATE — take as much of the available budget as possible.
  if (style === 'immediate') {
    return remaining
  }

  // SPREAD — only take this goal's fair share for the month,
  // based on how many eligible months it has left. This is a
  // request, not a guarantee: the caller still caps it by
  // whatever budget is actually left after higher-priority goals
  // have taken their share first.
  const deadline = new Date(goal.deadline)

  const remainingMonths = Math.max(
    1,
    (deadline.getFullYear() - year) * 12 + (deadline.getMonth() - month) + 1
  )

  return roundMoney(remaining / remainingMonths)
}

// =================================================
// HELPERS
// =================================================

function buildPlan(
  style: SpendingStyle,
  allocations: MonthlyAllocation[],
  totalAllocated: number,
  recommended: boolean
): AllocationPlan {
  const first = allocations[0]
  const last = allocations[allocations.length - 1]

  const isSingleMonth = allocations.length === 1

  return {
    type: style === 'immediate' ? 'immediate' : 'monthly',
    description: isSingleMonth
      ? `RM ${first.amount} in ${first.monthName}`
      : `RM ${first.amount} / month from ${first.monthName} to ${last.monthName}`,
    amount: totalAllocated,
    recommended,
    monthlyAllocations: allocations,
  }
}

function sameSchedule(a: MonthlyAllocation[], b: MonthlyAllocation[]): boolean {
  if (a.length !== b.length) {
    return false
  }

  return a.every((allocation, index) => {
    const other = b[index]
    return (
      allocation.month === other.month &&
      allocation.year === other.year &&
      allocation.amount === other.amount
    )
  })
}

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

  if (newTotal >= goal.targetAmount && completionDates.get(goal.id) === null) {
    completionDates.set(goal.id, formatMonthYear(month, year))
  }
}