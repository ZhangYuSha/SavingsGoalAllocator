import type { Goal } from '../types/goal'
import type { MonthlyBudget } from '../types/monthlyBudget'

import type {
  MonthlyAllocation,
  SystemAllocation,
  SystemGoalAllocation,
} from '../types/Allocation'

import { formatMonthYear } from './dateUtils'
import {
  roundMoney,
  combineBudgetsByMonth,
  findAllocationTimeline,
} from './allocationUtils'

// The four strategies used to decide which goal gets funded first / how
// much each goal receives in a given month.
type AllocationMode = 'priority' | 'balanced' | 'deadline' | 'target'

// Mutable, per-goal working state used while simulating a single candidate
// allocation across the whole timeline (one GoalState per Goal).
interface GoalState {
  goal: Goal
  allocated: number // running total allocated to this goal so far
  monthlyAllocations: MonthlyAllocation[] // month-by-month breakdown of allocations
}

// =================================================
// MAIN SYSTEM ALLOCATION
// =================================================

/**
 * Entry point: given a list of goals and the user's monthly budgets,
 * simulate several different allocation strategies ("candidates"), score
 * each one, deduplicate, and return the top 3 ranked candidates.
 */
export function generateSystemAllocation(
  goals: Goal[],
  budgets: MonthlyBudget[]
): SystemAllocation[] {
  // Nothing to allocate if there are no goals or no budget data at all.
  if (goals.length === 0 || budgets.length === 0) {
    return []
  }

  const candidates: SystemAllocation[] = []

  // Baseline candidate: best normal priority allocation.
  // (Highest priority goals get funded first, no rotation applied.)
  const priorityCandidate = generateCandidate(goals, budgets, 'priority', false)

  if (priorityCandidate !== null) {
    candidates.push(priorityCandidate)
  }

  // Alternative strategies.
  // Each strategy pairs an AllocationMode with a "variation" flag.
  // When variation = true, sortGoals() rotates the goal order (moves the
  // first goal to the back) to produce a structurally different result,
  // giving us more distinct candidates to choose from.
  const strategies: { mode: AllocationMode; variation: boolean }[] = [
    { mode: 'balanced', variation: false },
    { mode: 'deadline', variation: false },
    { mode: 'target', variation: false },
    { mode: 'priority', variation: true },
    { mode: 'deadline', variation: true },
    { mode: 'balanced', variation: true },
    { mode: 'target', variation: true },
  ]

  // Generate one candidate allocation per strategy and collect the
  // successful ones (generateCandidate returns null if no valid timeline
  // could be found for the given goals/budgets).
  for (const strategy of strategies) {
    const candidate = generateCandidate(goals, budgets, strategy.mode, strategy.variation)

    if (candidate !== null) {
      candidates.push(candidate)
    }
  }

  // Different strategies can sometimes converge on identical results
  // (same per-goal, per-month allocations) — drop exact duplicates.
  const uniqueCandidates = removeDuplicates(candidates)

  // Sort by score. We calculate all scores first, then sort —
  // Top 1 / Top 2 / Top 3 is never decided by generation order.
  uniqueCandidates.sort((a, b) => {
    // Primary sort key: overall weighted score (higher is better).
    if (b.score !== a.score) {
      return b.score - a.score
    }

    // Tie-break 1: prefer the candidate that allocates more money earlier.
    const earlyA = calculateEarlyFundingFromResult(a)
    const earlyB = calculateEarlyFundingFromResult(b)

    if (earlyB !== earlyA) {
      return earlyB - earlyA
    }

    // Tie-break 2: fewer allocation months is better (less spread out,
    // simpler plan for the user to follow).
    return countAllocationMonths(a) - countAllocationMonths(b)
  })

  // Keep only the top 3 candidates, and stamp them with their final
  // rank (1-3) and a human-readable title.
  return uniqueCandidates.slice(0, 3).map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
    title: getRankTitle(index + 1),
  }))
}

// =================================================
// GENERATE CANDIDATE
// =================================================

/**
 * Simulates a single allocation strategy month-by-month across the full
 * timeline (from the earliest possible start to the latest goal deadline),
 * distributing each month's available budget among active goals according
 * to `mode` (and `variation`, which changes goal ordering).
 *
 * Returns null if no valid timeline exists for the given goals/budgets.
 */
function generateCandidate(
  goals: Goal[],
  budgets: MonthlyBudget[],
  mode: AllocationMode,
  variation: boolean
): SystemAllocation | null {
  // Fresh working state for every goal, reset for this candidate run.
  const states: GoalState[] = goals.map(goal => ({
    goal,
    allocated: 0,
    monthlyAllocations: [],
  }))

  // Lookup of total budget available per "year-month" key.
  const budgetMap = combineBudgetsByMonth(budgets)

  // Determines the overall simulation window: earliest start date across
  // goals/budgets, and the latest goal deadline.
  const timeline = findAllocationTimeline(goals, budgets)

  if (timeline === null) {
    return null
  }

  const current = new Date(timeline.earliest)
  const latestDeadline = timeline.latestDeadline

  // Any unused budget from a month carries forward into the next month.
  let carryForward = 0

  // Walk forward one month at a time from the earliest date to the
  // latest deadline, distributing budget among eligible goals.
  while (current <= latestDeadline) {
    const month = current.getMonth()
    const year = current.getFullYear()
    const key = `${year}-${month}`

    // Budget newly available this calendar month (0 if none defined).
    const newBudget = budgetMap.get(key) ?? 0

    // Total money available to allocate this month = leftover from
    // previous months + this month's new budget.
    let availableBudget = carryForward + newBudget

    if (availableBudget > 0) {
      // A goal is "active" this month if:
      //  - its start date has already occurred (start <= current month)
      //  - its deadline hasn't passed yet (current month <= deadline)
      //  - it isn't already fully funded
      const activeGoals = states.filter(state => {
        const start = new Date(state.goal.startDate)
        const deadline = new Date(state.goal.deadline)

        const currentMonth = new Date(year, month, 1)
        const startMonth = new Date(start.getFullYear(), start.getMonth(), 1)
        const deadlineMonth = new Date(deadline.getFullYear(), deadline.getMonth(), 1)

        return (
          currentMonth >= startMonth &&
          currentMonth <= deadlineMonth &&
          state.allocated < state.goal.targetAmount
        )
      })

      // Order the active goals according to the chosen strategy
      // (and rotate the order if `variation` is set).
      const orderedGoals = sortGoals(activeGoals, mode, variation)

      // Distribute this month's available budget across goals in the
      // chosen order, until either the budget or the goals run out.
      for (const state of orderedGoals) {
        if (availableBudget <= 0) {
          break
        }

        const remaining = Math.max(0, state.goal.targetAmount - state.allocated)

        // Goal is already fully funded — nothing to do.
        if (remaining <= 0) {
          continue
        }

        // Compute how much this goal "wants" this month according to
        // the strategy's rules (may exceed what's actually available).
        const allocation = calculateAllocation(
          state,
          orderedGoals,
          availableBudget,
          mode,
          year,
          month
        )

        // Clamp to what's actually available and what's still needed.
        const actual = Math.min(allocation, availableBudget, remaining)

        if (actual <= 0) {
          continue
        }

        // Record the allocation against this goal for this month.
        addAllocation(state, actual, month, year)

        // Deduct what was just allocated from this month's pool.
        availableBudget = roundMoney(availableBudget - actual)
      }
    }

    // Whatever wasn't allocated this month rolls into next month.
    carryForward = availableBudget
    current.setMonth(current.getMonth() + 1)
  }

  // Convert internal working state into the public-facing shape,
  // computing percentage funded and whether the goal is fully reachable.
  const systemGoals: SystemGoalAllocation[] = states.map(state => {
    const percentage =
      state.goal.targetAmount === 0
        ? 100
        : Math.min(100, Math.round((state.allocated / state.goal.targetAmount) * 100))

    return {
      goalId: state.goal.id,
      goalName: state.goal.name,
      targetAmount: state.goal.targetAmount,
      totalAllocated: roundMoney(state.allocated),
      percentage,
      reachable: state.allocated >= state.goal.targetAmount,
      monthlyAllocations: state.monthlyAllocations,
    }
  })

  // Score this whole candidate allocation (see calculateScore for weights).
  const score = calculateScore(states)

  // rank/title are placeholders — filled in later once all candidates
  // have been generated and sorted in generateSystemAllocation().
  return {
    rank: 0,
    title: '',
    score,
    goals: systemGoals,
  }
}

// =================================================
// SORT GOALS
// =================================================

/**
 * Orders a set of goal states according to the given strategy `mode`.
 * If `variation` is true, rotates the sorted list by moving the first
 * element to the end — used to generate an alternate candidate that
 * still respects the same underlying strategy but funds goals in a
 * slightly different order.
 */
function sortGoals(
  states: GoalState[],
  mode: AllocationMode,
  variation: boolean
): GoalState[] {
  const sorted = [...states]

  sorted.sort((a, b) => {
    const aRemaining = Math.max(0, a.goal.targetAmount - a.allocated)
    const bRemaining = Math.max(0, b.goal.targetAmount - b.allocated)

    if (mode === 'priority') {
      // Higher priority value funded first; ties broken by earliest deadline.
      if (b.goal.priority !== a.goal.priority) {
        return b.goal.priority - a.goal.priority
      }
      return new Date(a.goal.deadline).getTime() - new Date(b.goal.deadline).getTime()
    }

    if (mode === 'deadline') {
      // Soonest deadline funded first.
      return new Date(a.goal.deadline).getTime() - new Date(b.goal.deadline).getTime()
    }

    if (mode === 'target') {
      // Goal with the largest remaining amount needed funded first.
      return bRemaining - aRemaining
    }

    // BALANCED — order by funding progress so far (least-funded first),
    // so all goals get pulled up toward similar completion percentages.
    const aPercentage = a.goal.targetAmount === 0 ? 1 : a.allocated / a.goal.targetAmount
    const bPercentage = b.goal.targetAmount === 0 ? 1 : b.allocated / b.goal.targetAmount

    if (aPercentage !== bPercentage) {
      return aPercentage - bPercentage
    }

    return new Date(a.goal.deadline).getTime() - new Date(b.goal.deadline).getTime()
  })

  // Rotate the order to produce a different allocation combination.
  // (Moves the first-sorted goal to the back of the line, changing who
  // effectively gets first pick of the month's budget.)
  if (variation && sorted.length > 1) {
    const first = sorted.shift()

    if (first !== undefined) {
      sorted.push(first)
    }
  }

  return sorted
}

// =================================================
// CALCULATE ALLOCATION
// =================================================

/**
 * Computes how much a single goal should receive this month, according
 * to the active strategy. The result may still be clamped later against
 * the actual available budget and the goal's remaining need.
 */
function calculateAllocation(
  state: GoalState,
  orderedGoals: GoalState[],
  availableBudget: number,
  mode: AllocationMode,
  year: number,
  month: number
): number {
  const remaining = Math.max(0, state.goal.targetAmount - state.allocated)

  // PRIORITY — fund the highest-priority goal first.
  // Takes as much of the available budget as it needs (greedy).
  if (mode === 'priority') {
    return Math.min(remaining, availableBudget)
  }

  // DEADLINE — spread according to remaining months.
  // Divides what's left evenly over however many months remain until
  // the goal's deadline, so it finishes right on time rather than early.
  if (mode === 'deadline') {
    const deadline = new Date(state.goal.deadline)

    const remainingMonths = Math.max(
      1,
      (deadline.getFullYear() - year) * 12 + (deadline.getMonth() - month) + 1
    )

    return Math.min(remaining, roundMoney(remaining / remainingMonths))
  }

  // TARGET — divide available money proportionally by remaining target.
  // Goals that still need more money get a proportionally larger slice
  // of this month's budget.
  if (mode === 'target') {
    const totalRemaining = orderedGoals.reduce(
      (sum, current) => sum + Math.max(0, current.goal.targetAmount - current.allocated),
      0
    )

    if (totalRemaining <= 0) {
      return 0
    }

    return Math.min(remaining, roundMoney(availableBudget * (remaining / totalRemaining)))
  }

  // BALANCED — split the available budget evenly across all currently
  // active goals, regardless of how much each still needs.
  const activeGoalCount = orderedGoals.length

  if (activeGoalCount <= 0) {
    return 0
  }

  return Math.min(remaining, roundMoney(availableBudget / activeGoalCount))
}

// =================================================
// ADD ALLOCATION
// =================================================

/**
 * Records `amount` as allocated to `state`'s goal for the given month/year,
 * updating the running total and either merging into an existing
 * monthly entry or creating a new one.
 */
function addAllocation(state: GoalState, amount: number, month: number, year: number): void {
  state.allocated = roundMoney(state.allocated + amount)

  // A goal could already have an entry for this month (e.g. it received
  // budget in an earlier pass this same month), so merge rather than
  // duplicate.
  const existing = state.monthlyAllocations.find(
    allocation => allocation.month === month && allocation.year === year
  )

  if (existing) {
    existing.amount = roundMoney(existing.amount + amount)
  } else {
    state.monthlyAllocations.push({
      month,
      year,
      monthName: formatMonthYear(month, year),
      amount: roundMoney(amount),
    })
  }
}

// =================================================
// SCORE
// =================================================
//
// SCORE WEIGHTS
// Funding             35%
// Completion speed    25%
// Early funding       20%
// Priority            10%
// Less spreading      10%
// =================================================

/**
 * Computes a single weighted score (0-100) for a candidate allocation,
 * combining five sub-scores (each normalized to 0-1 before weighting):
 *   1. Funding      — how much of the total target was actually funded
 *   2. Completion    — how early (relative to each goal's own timeline)
 *                      goals finished, for goals that did complete
 *   3. Early funding — how front-loaded each goal's monthly contributions
 *                      were, weighted so earlier months count more
 *   4. Priority      — funding progress weighted by each goal's priority
 *   5. Spreading     — rewards fewer distinct months of contribution
 *                      (simpler plans) over many small scattered ones
 */
function calculateScore(states: GoalState[]): number {
  if (states.length === 0) {
    return 0
  }

  // 1. FUNDING SCORE — 35%
  // Ratio of total money allocated to total money targeted, across all goals.
  const totalTarget = states.reduce((sum, state) => sum + state.goal.targetAmount, 0)
  const totalAllocated = states.reduce((sum, state) => sum + state.allocated, 0)

  const fundingScore = totalTarget <= 0 ? 1 : Math.min(1, totalAllocated / totalTarget)

  // 2. COMPLETION SPEED — 25% (earlier completion scores higher)
  // For each fully-funded goal, measures how many months of its
  // available window (start -> deadline) were actually used before it
  // hit its target — using fewer months scores closer to 1.
  let completionTotal = 0

  for (const state of states) {
    if (state.goal.targetAmount <= 0) {
      // No target to hit — treat as trivially "complete".
      completionTotal += 1
      continue
    }

    if (state.allocated < state.goal.targetAmount) {
      // Not fully funded — contributes 0 to completion score.
      continue
    }

    const allocations = state.monthlyAllocations

    if (allocations.length === 0) {
      continue
    }

    const start = new Date(state.goal.startDate)
    const deadline = new Date(state.goal.deadline)
    // The last monthly allocation entry marks when the goal was completed.
    const completion = allocations[allocations.length - 1]

    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1)
    const deadlineMonth = new Date(deadline.getFullYear(), deadline.getMonth(), 1)
    const completionMonth = new Date(completion.year, completion.month, 1)

    // Total months available for this goal, start to deadline inclusive.
    const totalMonths = Math.max(
      1,
      (deadlineMonth.getFullYear() - startMonth.getFullYear()) * 12 +
        (deadlineMonth.getMonth() - startMonth.getMonth()) +
        1
    )

    // How many months it actually took to reach the target, start to
    // completion month inclusive.
    const monthsUsed = Math.max(
      1,
      (completionMonth.getFullYear() - startMonth.getFullYear()) * 12 +
        (completionMonth.getMonth() - startMonth.getMonth()) +
        1
    )

    // 1.0 if completed in the very first month, trending toward 0 as
    // monthsUsed approaches totalMonths (i.e. finishing right at the
    // deadline scores near 0 on this sub-metric).
    completionTotal += Math.max(0, 1 - (monthsUsed - 1) / totalMonths)
  }

  const completionScore = completionTotal / states.length

  // 3. EARLY FUNDING — 20% (earlier months are weighted more heavily)
  // For each goal, computes a weighted average of "% of target funded
  // per month", where earlier months in the goal's window get a larger
  // weight — rewarding plans that front-load contributions.
  let earlyFundingTotal = 0

  for (const state of states) {
    if (state.goal.targetAmount <= 0) {
      earlyFundingTotal += 1
      continue
    }

    if (state.monthlyAllocations.length === 0) {
      continue
    }

    const start = new Date(state.goal.startDate)
    const deadline = new Date(state.goal.deadline)

    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1)
    const deadlineMonth = new Date(deadline.getFullYear(), deadline.getMonth(), 1)

    const totalMonths = Math.max(
      1,
      (deadlineMonth.getFullYear() - startMonth.getFullYear()) * 12 +
        (deadlineMonth.getMonth() - startMonth.getMonth()) +
        1
    )

    let weightedFunding = 0
    let totalWeight = 0

    for (const allocation of state.monthlyAllocations) {
      const allocationMonth = new Date(allocation.year, allocation.month, 1)

      const monthsFromStart = Math.max(
        0,
        (allocationMonth.getFullYear() - startMonth.getFullYear()) * 12 +
          (allocationMonth.getMonth() - startMonth.getMonth())
      )

      // Earlier months get more weight (first month = totalMonths, next = totalMonths - 1, ...).
      const weight = Math.max(1, totalMonths - monthsFromStart)

      // What fraction of the total target this single month's
      // allocation represents.
      const fundingPercentage = Math.min(1, allocation.amount / state.goal.targetAmount)

      weightedFunding += fundingPercentage * weight
      totalWeight += weight
    }

    if (totalWeight > 0) {
      earlyFundingTotal += Math.min(1, weightedFunding / totalWeight)
    }
  }

  const earlyFundingScore = earlyFundingTotal / states.length

  // 4. PRIORITY — 10%
  // Funding progress (0-1) per goal, weighted by that goal's priority,
  // so higher-priority goals matter more to this sub-score.
  const totalPriority = states.reduce(
    (sum, state) => sum + Math.max(1, state.goal.priority),
    0
  )

  let priorityScore = 0

  if (totalPriority > 0) {
    priorityScore =
      states.reduce((sum, state) => {
        const progress =
          state.goal.targetAmount <= 0
            ? 1
            : Math.min(1, state.allocated / state.goal.targetAmount)

        return sum + progress * Math.max(1, state.goal.priority)
      }, 0) / totalPriority
  }

  // 5. LESS SPREADING — 10% (fewer allocation months is better)
  // Rewards goals funded in fewer distinct months (1/months), capping
  // at 1.0 for goals funded in 0 or 1 month.
  let spreadingTotal = 0

  for (const state of states) {
    const months = state.monthlyAllocations.length

    if (months <= 1) {
      spreadingTotal += 1
      continue
    }

    spreadingTotal += 1 / months
  }

  const spreadingScore = spreadingTotal / states.length

  // FINAL SCORE — weighted sum of all five sub-scores (each 0-1),
  // scaled by their respective weight out of 100, rounded to 2 decimals.
  const score =
    fundingScore * 35 +
    completionScore * 25 +
    earlyFundingScore * 20 +
    priorityScore * 10 +
    spreadingScore * 10

  return Math.round(score * 100) / 100
}

// =================================================
// TIE-BREAKER: EARLY FUNDING FROM FINAL RESULT
// =================================================

/**
 * Lightweight tie-breaker metric (distinct from the full earlyFundingScore
 * above): for each goal, looks only at the very first monthly allocation
 * and computes what fraction of the target it represents, then averages
 * across goals. Used only to break ties when two candidates have the
 * same overall score.
 */
function calculateEarlyFundingFromResult(candidate: SystemAllocation): number {
  let total = 0
  let count = 0

  for (const goal of candidate.goals) {
    if (goal.targetAmount <= 0) {
      continue
    }

    if (goal.monthlyAllocations.length === 0) {
      continue
    }

    const firstAllocation = goal.monthlyAllocations[0]

    total += firstAllocation.amount / goal.targetAmount
    count++
  }

  return count === 0 ? 0 : total / count
}

// =================================================
// COUNT ALLOCATION MONTHS
// =================================================

/**
 * Total number of (goal, month) allocation entries across the whole
 * candidate — used as a final tie-breaker (fewer = simpler plan).
 */
function countAllocationMonths(candidate: SystemAllocation): number {
  return candidate.goals.reduce((sum, goal) => sum + goal.monthlyAllocations.length, 0)
}

// =================================================
// REMOVE DUPLICATES
// =================================================

/**
 * Filters out candidates that produced byte-for-byte identical allocation
 * results (same amounts, in the same months, for the same goals), even if
 * they came from different strategies. Builds a signature string per
 * candidate and keeps only the first occurrence of each signature.
 */
function removeDuplicates(candidates: SystemAllocation[]): SystemAllocation[] {
  const seen = new Set<string>()
  const unique: SystemAllocation[] = []

  for (const candidate of candidates) {
    const signature = candidate.goals
      .map(goal => {
        const monthly = goal.monthlyAllocations
          .map(allocation => `${allocation.year}-${allocation.month}-${roundMoney(allocation.amount)}`)
          .join(',')

        return `${goal.goalId}:${monthly}`
      })
      .join('|')

    if (seen.has(signature)) {
      continue
    }

    seen.add(signature)
    unique.push(candidate)
  }

  return unique
}

// =================================================
// RANK TITLE
// =================================================

/**
 * Maps a 1-based rank to its display title.
 */
function getRankTitle(rank: number): string {
  if (rank === 1) {
    return 'Best Combination'
  }

  if (rank === 2) {
    return 'Second-Best Combination'
  }

  return 'Third-Best Combination'
}