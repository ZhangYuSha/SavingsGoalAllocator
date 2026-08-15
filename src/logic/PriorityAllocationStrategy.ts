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

/**
 * =================================================
 * PRIORITY ALLOCATION STRATEGY
 * =================================================
 *
 * Splits a limited monthly budget across competing savings
 * goals, highest priority first, and produces two views of the
 * result for each goal: a "recommended" schedule and a "spread"
 * alternative.
 *
 * WORKED EXAMPLE — used throughout this file's comments:
 *
 *   Goals:
 *     Laptop — target RM1000, priority 5, Aug 2026 -> Sep 2026
 *     Trip   — target RM1000, priority 5, Aug 2026 -> Sep 2026
 *
 *   Budgets:
 *     Aug 2026 — RM1000
 *     Sep 2026 — RM1000
 *
 *   Both goals are tied on priority and want the same money in
 *   the same months, so this is the trickiest case: whichever
 *   goal is listed first in the `goals` array wins August, and
 *   the other has to wait for September. Nobody invents extra
 *   money to cover both goals in the same month.
 */
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
    // invent money — unlike an earlier version of this file,
    // which computed each goal's plan in isolation and let two
    // goals both claim the same month's budget at once.
    //
    // WORKED EXAMPLE — "immediate" run on Laptop/Trip:
    //   August:  Laptop claims RM1000 (all of it). Trip wants
    //            RM1000 but nothing is left, so it gets RM0.
    //   September: Trip claims the RM1000 that's now available.
    //   Result: Laptop = [Aug: RM1000], Trip = [Sep: RM1000]
    //
    // WORKED EXAMPLE — "spread" run on the same input:
    //   August: Laptop's fair share = RM1000 / 2 remaining
    //           months = RM500. It claims RM500, leaving RM500
    //           in the pool. Trip's fair share is also RM500,
    //           and RM500 is exactly what's left, so it claims
    //           all of it.
    //   September: Laptop has RM500 left over 1 remaining month
    //              -> claims RM500. Same for Trip, but only
    //              RM500 is left in the pool (RM1000 budget -
    //              RM500 already taken by Laptop), so Trip gets
    //              exactly its RM500 too.
    //   Result: Laptop = [Aug: RM500, Sep: RM500]
    //           Trip   = [Aug: RM500, Sep: RM500]

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
//
// This is the ONLY place money is ever handed out. Both the
// "immediate" and "spread" runs go through this same function,
// so both are guaranteed to respect the same shared budget —
// there is no separate, isolated calculation anywhere else that
// could disagree with what actually happened here.
//
// WORKED EXAMPLE — one full pass of the while-loop below, using
// the Laptop/Trip input from the class-level comment, style =
// 'immediate':
//
//   Loop iteration 1 (month = August 2026):
//     newBudget = 1000 (from budgetMap["2026-7"])
//     carryForward = 0 (first month)
//     availableBudget = 0 + 1000 = 1000
//     activeGoals, sorted by priority then deadline:
//       [Laptop, Trip]  (tied on priority + deadline, so the
//        original array order — insertion order — decides)
//     Loop over activeGoals:
//       Laptop: remaining = 1000, claim('immediate') = 1000,
//               allocation = min(1000, 1000, 1000) = 1000
//               -> addAllocation(Laptop, 1000, Aug)
//               -> availableBudget = 1000 - 1000 = 0
//       Trip:   availableBudget is 0, loop breaks immediately
//               -> Trip gets nothing this month
//     carryForward = 0 (nothing left over)
//
//   Loop iteration 2 (month = September 2026):
//     newBudget = 1000
//     availableBudget = 0 + 1000 = 1000
//     activeGoals: Trip is still active (not yet at its target);
//       Laptop is now excluded because alreadyAllocated (1000)
//       >= targetAmount (1000)
//     Loop over activeGoals:
//       Trip: remaining = 1000, claim = 1000,
//             allocation = min(1000, 1000, 1000) = 1000
//             -> addAllocation(Trip, 1000, Sep)
//             -> availableBudget = 0
//     carryForward = 0
//
//   current now exceeds latestDeadline (Sep 2026), loop ends.
//   Final: Laptop = RM1000 (Aug), Trip = RM1000 (Sep)

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

  // Money left over from a month that wasn't fully spent rolls
  // into next month's availableBudget. Example: if August had
  // RM1000 budget but goals only needed RM700 total, carryForward
  // becomes RM300 and September starts with RM300 + September's
  // own budget.
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

        // A goal is "active" this month if the month falls within
        // its start-to-deadline window AND it hasn't already hit
        // its target. Example: a goal with deadline July 2026 is
        // excluded once `current` moves to August 2026 — it no
        // longer competes for that month's money.
        return (
          currentMonth >= startMonth &&
          currentMonth <= deadlineMonth &&
          alreadyAllocated < goal.targetAmount
        )
      })
      // Higher priority goals still get first crack at the
      // month's money in both styles — only HOW MUCH each one
      // takes differs. Equal priority falls back to earlier
      // deadline first; if that's also equal, JS's stable sort
      // preserves the original array order (see worked example
      // above, where Laptop beats Trip only because it appears
      // first in the input array).
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

      // The goal can never receive more than: what it still
      // needs (remaining), what it's asking for this month
      // (claim), or what's actually left in the shared pool
      // (availableBudget). Taking the minimum of all three is
      // what prevents any goal from claiming money that belongs
      // to another goal — this is the fix for the original bug.
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
//
// This only decides what a goal WANTS this month — it's the
// engine's Math.min(...) above that decides what it actually
// GETS, based on what's really left in the shared pool.

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

  // SPREAD — only take this goal's fair share for the month,
  // based on how many eligible months it has left. This is a
  // request, not a guarantee: the caller still caps it by
  // whatever budget is actually left after higher-priority goals
  // have taken their share first.
  //
  // Example: Laptop has RM1000 remaining, deadline September
  // 2026, and it's currently August 2026.
  //   remainingMonths = (2026 - 2026) * 12 + (8 - 7) + 1 = 2
  //   claim = roundMoney(1000 / 2) = 500
  // So it asks for RM500 in August, leaving room in the shared
  // pool for other goals that month.
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

/**
 * Turns a goal's raw month-by-month allocations into the
 * user-facing plan shown on its card.
 *
 * `allocations` is expected in chronological order — the engine
 * always appends entries in the order months are visited — so
 * `first` and `last` here correctly mean "earliest month" and
 * "latest month," not just "first/last in some arbitrary order."
 *
 * Single-month example: allocations = [{amount: 1000, monthName:
 * "August 2026"}] -> description = "RM 1000 in August 2026"
 *
 * Multi-month example: allocations = [{amount: 500, monthName:
 * "August 2026"}, {amount: 500, monthName: "September 2026"}]
 * -> description = "RM 500 / month from August 2026 to
 * September 2026"
 */
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

/**
 * Records that `goal` received `amount` in a given month, and
 * updates its running total and (if this payment finishes the
 * goal) its completion date.
 *
 * Example: goal already has RM500 allocated, with one entry
 * {Aug 2026: RM500} in its monthly list. Calling
 * addAllocation(goal, 500, month=8, year=2026, ...) again for
 * September:
 *   previous = 500, newTotal = roundMoney(500 + 500) = 1000
 *   no existing entry for (Sep, 2026), so a new entry is pushed:
 *     {month: 8, year: 2026, monthName: "September 2026",
 *      amount: 500}
 *   newTotal (1000) >= goal.targetAmount (1000) and no
 *   completion date was set yet, so completionDates is set to
 *   "September 2026".
 *
 * If addAllocation were instead called twice for the SAME month
 * (e.g. because a goal is topped up more than once within one
 * pass of the loop), the existing entry for that month is found
 * and its amount is incremented in place, rather than creating a
 * duplicate row for the same month.
 */
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