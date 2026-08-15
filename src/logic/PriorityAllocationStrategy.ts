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

// How a goal wants to consume its share of the budget each month:
// - 'immediate': grab as much of the available budget as possible right away
// - 'spread':    spread the remaining amount evenly across the months left until the deadline
type SpendingStyle = 'immediate' | 'spread'

// Internal working state produced by a single simulation pass (one run of `runEngine`).
interface EngineResult {
  allocatedByGoal: Map<number, number>
  monthlyAllocationsByGoal: Map<number, MonthlyAllocation[]>
  completionDates: Map<number, string | null>
}

/**
 * Allocation strategy that funds goals strictly in priority order each month
 * (highest priority first, ties broken by earliest deadline), simulating the
 * whole timeline twice — once "immediate" and once "spread" — so we can show
 * the user both a recommended plan and, when it differs, an alternative.
 */
export class PriorityAllocationStrategy implements AllocationStrategy {
  allocate(goals: Goal[], budgets: MonthlyBudget[]): AllocationResult[] {
    if (goals.length === 0) {
      return []
    }

    // Collapse budgets into a single lookup keyed by "year-month".
    const budgetMap = combineBudgetsByMonth(budgets)
    // Determine the overall simulation window (earliest goal start to latest deadline).
    const timeline = findAllocationTimeline(goals, budgets)

    if (timeline === null) {
      return []
    }

    // Run the full simulation twice with different spending styles so we can
    // compare a "recommended" (immediate) plan against an "alternative" (spread) one.
    const primary = runEngine(goals, budgetMap, timeline, 'immediate')
    const alternative = runEngine(goals, budgetMap, timeline, 'spread')

    // BUILD RESULTS

    return goals.map(goal => {
      const totalAllocated = primary.allocatedByGoal.get(goal.id) ?? 0
      const primaryAllocations = primary.monthlyAllocationsByGoal.get(goal.id) ?? []
      const alternativeAllocations = alternative.monthlyAllocationsByGoal.get(goal.id) ?? []
      const alternativeTotal = alternative.allocatedByGoal.get(goal.id) ?? 0

      // How much the user would need to save per month if funding this goal alone,
      // independent of the simulation — used for display/comparison purposes.
      const requiredMonthly = calculateMonthlySaving(
        goal.targetAmount,
        goal.startDate,
        goal.deadline
      )

      const allocationPlans: AllocationPlan[] = []

      // The "immediate" run is always shown as the recommended plan, if it produced anything.
      if (primaryAllocations.length > 0) {
        allocationPlans.push(
          buildPlan('immediate', primaryAllocations, totalAllocated, true)
        )
      }

      // Only offer the spread option if it actually plays out
      // differently for this goal — otherwise it's just the same
      // schedule shown twice.
      //
      // WORKED EXAMPLE: for Laptop, primary = [Aug: RM1000] and
      // alternative = [Aug: RM500, Sep: RM500]. These differ
      // (different length, different amounts), so BOTH plans are
      // shown: "Recommended: RM1000 in August" and "Alternative:
      // RM500/month from August to September".
      if (
        alternativeAllocations.length > 0 &&
        !sameSchedule(primaryAllocations, alternativeAllocations)
      ) {
        allocationPlans.push(
          buildPlan('spread', alternativeAllocations, alternativeTotal, false)
        )
      }

      // Whatever the primary (immediate) run couldn't cover before the deadline.
      const shortfall = Math.max(0, goal.targetAmount - totalAllocated)

      // Progress toward the goal, capped at 100%; a zero-target goal is trivially "complete".
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

/**
 * Simulates the budget month by month across the full timeline, funding
 * goals strictly in priority order (with unspent budget carried forward to
 * the next month) until every month in the window has been processed.
 */
function runEngine(
  goals: Goal[],
  budgetMap: Map<string, number>,
  timeline: { earliest: Date; latestDeadline: Date },
  style: SpendingStyle
): EngineResult {
  const allocatedByGoal = new Map<number, number>()
  const monthlyAllocationsByGoal = new Map<number, MonthlyAllocation[]>()
  const completionDates = new Map<number, string | null>()

  // Initialize per-goal tracking state before the simulation starts.
  for (const goal of goals) {
    allocatedByGoal.set(goal.id, 0)
    monthlyAllocationsByGoal.set(goal.id, [])
    completionDates.set(goal.id, null)
  }

  const current = new Date(timeline.earliest)
  const latestDeadline = timeline.latestDeadline

  // Budget left over from the previous month that rolls into the current month.
  let carryForward = 0

  // Walk forward one month at a time until we pass the last goal's deadline.
  while (current <= latestDeadline) {
    const month = current.getMonth()
    const year = current.getFullYear()
    const key = `${year}-${month}`

    const newBudget = budgetMap.get(key) ?? 0

    // Total money available to allocate this month = leftover + this month's budget.
    let availableBudget = carryForward + newBudget

    // Determine which goals are eligible to receive money this month:
    // - the current month falls within the goal's start/deadline window, and
    // - the goal hasn't already been fully funded.
    // Then sort by priority (highest first), breaking ties by earliest deadline.
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
      .sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority
        }
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      })

    // Hand out this month's available budget to goals in priority order.
    for (const goal of activeGoals) {
      if (availableBudget <= 0) {
        break
      }

      const alreadyAllocated = allocatedByGoal.get(goal.id) ?? 0
      const remaining = Math.max(0, goal.targetAmount - alreadyAllocated)

      if (remaining <= 0) {
        continue
      }

      // How much this goal is asking for this month, based on its spending style.
      const claim = calculateClaim(goal, remaining, year, month, style)

      // Never give more than what's available, what's still needed, or what was claimed.
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

    // Anything not spent this month rolls forward into the next month.
    carryForward = availableBudget
    current.setMonth(current.getMonth() + 1)
  }

  return { allocatedByGoal, monthlyAllocationsByGoal, completionDates }
}

// CALCULATE CLAIM — how much a goal asks for this month

function calculateClaim(
  goal: Goal,
  remaining: number,
  year: number,
  month: number,
  style: SpendingStyle
): number {
  // IMMEDIATE — take as much of the available budget as possible.
  //
  // Example: Laptop has RM1000 remaining in August. It asks for
  // all RM1000, regardless of how many months it has left.
  if (style === 'immediate') {
    return remaining
  }

  // SPREAD — divide what's left evenly across the remaining eligible months
  // (inclusive of the current month), so the goal asks for a level monthly amount.
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

// Turns a goal's list of monthly allocations into a user-facing plan summary
// (e.g. a single lump sum, or a "RM X / month from ... to ..." description).
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

/**
 * True only if two allocation schedules are identical month by
 * month — same months, same amounts, same order.
 *
 * Example (different): a = [{Aug, 1000}], b = [{Aug, 500},
 * {Sep, 500}] -> false (different length) -> "Alternative" plan
 * IS shown.
 *
 * Example (same): a = [{Aug, 1000}], b = [{Aug, 1000}] -> true
 * -> "Alternative" plan is hidden, since it wouldn't tell the
 * user anything the "Recommended" plan didn't already show. This
 * happens for a goal with only one eligible month, where
 * "immediate" and "spread" collapse to the same single payment.
 */
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

// Records `amount` as allocated to `goal` in the given month/year: updates the
// running total, merges into (or creates) that month's entry in the goal's
// monthly allocation list, and stamps the completion date the first time the
// goal's target is reached.
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