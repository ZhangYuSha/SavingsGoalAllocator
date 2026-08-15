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

type AllocationMode = 'priority' | 'balanced' | 'deadline' | 'target'

interface GoalState {
  goal: Goal
  allocated: number
  monthlyAllocations: MonthlyAllocation[]
}

// =================================================
// MAIN SYSTEM ALLOCATION
// =================================================

export function generateSystemAllocation(
  goals: Goal[],
  budgets: MonthlyBudget[]
): SystemAllocation[] {
  if (goals.length === 0 || budgets.length === 0) {
    return []
  }

  const candidates: SystemAllocation[] = []

  // Baseline candidate: best normal priority allocation.
  const priorityCandidate = generateCandidate(goals, budgets, 'priority', false)

  if (priorityCandidate !== null) {
    candidates.push(priorityCandidate)
  }

  // Alternative strategies.
  const strategies: { mode: AllocationMode; variation: boolean }[] = [
    { mode: 'balanced', variation: false },
    { mode: 'deadline', variation: false },
    { mode: 'target', variation: false },
    { mode: 'priority', variation: true },
    { mode: 'deadline', variation: true },
    { mode: 'balanced', variation: true },
    { mode: 'target', variation: true },
  ]

  for (const strategy of strategies) {
    const candidate = generateCandidate(goals, budgets, strategy.mode, strategy.variation)

    if (candidate !== null) {
      candidates.push(candidate)
    }
  }

  const uniqueCandidates = removeDuplicates(candidates)

  // Sort by score. We calculate all scores first, then sort —
  // Top 1 / Top 2 / Top 3 is never decided by generation order.
  uniqueCandidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }

    // Tie-break 1: prefer the candidate that allocates more money earlier.
    const earlyA = calculateEarlyFundingFromResult(a)
    const earlyB = calculateEarlyFundingFromResult(b)

    if (earlyB !== earlyA) {
      return earlyB - earlyA
    }

    // Tie-break 2: fewer allocation months is better.
    return countAllocationMonths(a) - countAllocationMonths(b)
  })

  return uniqueCandidates.slice(0, 3).map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
    title: getRankTitle(index + 1),
  }))
}

// =================================================
// GENERATE CANDIDATE
// =================================================

function generateCandidate(
  goals: Goal[],
  budgets: MonthlyBudget[],
  mode: AllocationMode,
  variation: boolean
): SystemAllocation | null {
  const states: GoalState[] = goals.map(goal => ({
    goal,
    allocated: 0,
    monthlyAllocations: [],
  }))

  const budgetMap = combineBudgetsByMonth(budgets)

  const timeline = findAllocationTimeline(goals, budgets)

  if (timeline === null) {
    return null
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

    if (availableBudget > 0) {
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

      const orderedGoals = sortGoals(activeGoals, mode, variation)

      for (const state of orderedGoals) {
        if (availableBudget <= 0) {
          break
        }

        const remaining = Math.max(0, state.goal.targetAmount - state.allocated)

        if (remaining <= 0) {
          continue
        }

        const allocation = calculateAllocation(
          state,
          orderedGoals,
          availableBudget,
          mode,
          year,
          month
        )

        const actual = Math.min(allocation, availableBudget, remaining)

        if (actual <= 0) {
          continue
        }

        addAllocation(state, actual, month, year)

        availableBudget = roundMoney(availableBudget - actual)
      }
    }

    carryForward = availableBudget
    current.setMonth(current.getMonth() + 1)
  }

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

  const score = calculateScore(states)

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
      if (b.goal.priority !== a.goal.priority) {
        return b.goal.priority - a.goal.priority
      }
      return new Date(a.goal.deadline).getTime() - new Date(b.goal.deadline).getTime()
    }

    if (mode === 'deadline') {
      return new Date(a.goal.deadline).getTime() - new Date(b.goal.deadline).getTime()
    }

    if (mode === 'target') {
      return bRemaining - aRemaining
    }

    // BALANCED
    const aPercentage = a.goal.targetAmount === 0 ? 1 : a.allocated / a.goal.targetAmount
    const bPercentage = b.goal.targetAmount === 0 ? 1 : b.allocated / b.goal.targetAmount

    if (aPercentage !== bPercentage) {
      return aPercentage - bPercentage
    }

    return new Date(a.goal.deadline).getTime() - new Date(b.goal.deadline).getTime()
  })

  // Rotate the order to produce a different allocation combination.
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
  if (mode === 'priority') {
    return Math.min(remaining, availableBudget)
  }

  // DEADLINE — spread according to remaining months.
  if (mode === 'deadline') {
    const deadline = new Date(state.goal.deadline)

    const remainingMonths = Math.max(
      1,
      (deadline.getFullYear() - year) * 12 + (deadline.getMonth() - month) + 1
    )

    return Math.min(remaining, roundMoney(remaining / remainingMonths))
  }

  // TARGET — divide available money proportionally by remaining target.
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

  // BALANCED
  const activeGoalCount = orderedGoals.length

  if (activeGoalCount <= 0) {
    return 0
  }

  return Math.min(remaining, roundMoney(availableBudget / activeGoalCount))
}

// =================================================
// ADD ALLOCATION
// =================================================

function addAllocation(state: GoalState, amount: number, month: number, year: number): void {
  state.allocated = roundMoney(state.allocated + amount)

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

function calculateScore(states: GoalState[]): number {
  if (states.length === 0) {
    return 0
  }

  // 1. FUNDING SCORE — 35%
  const totalTarget = states.reduce((sum, state) => sum + state.goal.targetAmount, 0)
  const totalAllocated = states.reduce((sum, state) => sum + state.allocated, 0)

  const fundingScore = totalTarget <= 0 ? 1 : Math.min(1, totalAllocated / totalTarget)

  // 2. COMPLETION SPEED — 25% (earlier completion scores higher)
  let completionTotal = 0

  for (const state of states) {
    if (state.goal.targetAmount <= 0) {
      completionTotal += 1
      continue
    }

    if (state.allocated < state.goal.targetAmount) {
      continue
    }

    const allocations = state.monthlyAllocations

    if (allocations.length === 0) {
      continue
    }

    const start = new Date(state.goal.startDate)
    const deadline = new Date(state.goal.deadline)
    const completion = allocations[allocations.length - 1]

    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1)
    const deadlineMonth = new Date(deadline.getFullYear(), deadline.getMonth(), 1)
    const completionMonth = new Date(completion.year, completion.month, 1)

    const totalMonths = Math.max(
      1,
      (deadlineMonth.getFullYear() - startMonth.getFullYear()) * 12 +
        (deadlineMonth.getMonth() - startMonth.getMonth()) +
        1
    )

    const monthsUsed = Math.max(
      1,
      (completionMonth.getFullYear() - startMonth.getFullYear()) * 12 +
        (completionMonth.getMonth() - startMonth.getMonth()) +
        1
    )

    completionTotal += Math.max(0, 1 - (monthsUsed - 1) / totalMonths)
  }

  const completionScore = completionTotal / states.length

  // 3. EARLY FUNDING — 20% (earlier months are weighted more heavily)
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

  // FINAL SCORE
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

function countAllocationMonths(candidate: SystemAllocation): number {
  return candidate.goals.reduce((sum, goal) => sum + goal.monthlyAllocations.length, 0)
}

// =================================================
// REMOVE DUPLICATES
// =================================================

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

function getRankTitle(rank: number): string {
  if (rank === 1) {
    return 'Best Combination'
  }

  if (rank === 2) {
    return 'Second-Best Combination'
  }

  return 'Third-Best Combination'
}