import type { MonthlyBudget } from '../types/monthlyBudget'

/**
 * Rounds to 2 decimal places to avoid floating point drift
 * when repeatedly adding/subtracting money across months.
 */
export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

/**
 * Combines multiple budget entries for the same month/year
 * into a single lookup, keyed by "year-month".
 */
export function combineBudgetsByMonth(
  budgets: MonthlyBudget[]
): Map<string, number> {
  const budgetMap = new Map<string, number>()

  for (const budget of budgets) {
    const key = `${budget.year}-${budget.month}`
    const existing = budgetMap.get(key) ?? 0
    budgetMap.set(key, existing + budget.amount)
  }

  return budgetMap
}

/**
 * Finds the earliest relevant month (across goal start dates,
 * goal deadlines, and budget months) and the latest goal
 * deadline. Together these define the range of calendar months
 * an allocation engine needs to walk through.
 *
 * Returns null if there's nothing to process.
 */
export function findAllocationTimeline(
  goals: { startDate: string; deadline: string }[],
  budgets: MonthlyBudget[]
): { earliest: Date; latestDeadline: Date } | null {
  const dates: Date[] = []

  for (const goal of goals) {
    const start = new Date(goal.startDate)
    const deadline = new Date(goal.deadline)

    if (!Number.isNaN(start.getTime())) {
      dates.push(start)
    }

    if (!Number.isNaN(deadline.getTime())) {
      dates.push(deadline)
    }
  }

  for (const budget of budgets) {
    dates.push(new Date(budget.year, budget.month, 1))
  }

  if (dates.length === 0) {
    return null
  }

  const earliestTime = Math.min(
    ...dates.map(date =>
      new Date(date.getFullYear(), date.getMonth(), 1).getTime()
    )
  )

  const latestTime = Math.max(
    ...goals.map(goal => new Date(goal.deadline).getTime())
  )

  return {
    earliest: new Date(earliestTime),
    latestDeadline: new Date(latestTime),
  }
}