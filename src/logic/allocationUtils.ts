import type { MonthlyBudget } from '../types/monthlyBudget'

/**
 * Rounds to 2 decimal places to avoid floating point drift
 * when repeatedly adding/subtracting money across months.
 */
export function roundMoney(amount: number): number {
  // Adding Number.EPSILON before rounding guards against cases like
  // 1.005 * 100 landing on 100.499999... due to floating point
  // representation, which would otherwise round down incorrectly.
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

  // A given month could have multiple MonthlyBudget entries (e.g. from
  // different sources/categories) — sum them all into one total per key.
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
  // Collect every date that could possibly define the start of the
  // simulation window: each goal's start date, each goal's deadline,
  // and every budget month. The earliest of all of these becomes the
  // starting point.
  const dates: Date[] = []

  for (const goal of goals) {
    const start = new Date(goal.startDate)
    const deadline = new Date(goal.deadline)

    // Skip invalid/unparseable dates rather than letting NaN pollute
    // the earliest/latest calculations below.
    if (!Number.isNaN(start.getTime())) {
      dates.push(start)
    }

    if (!Number.isNaN(deadline.getTime())) {
      dates.push(deadline)
    }
  }

  // Budget entries only carry year/month (no day), so normalize them
  // to the 1st of that month for comparison purposes.
  for (const budget of budgets) {
    dates.push(new Date(budget.year, budget.month, 1))
  }

  // No goal dates and no budget entries — there's no timeline to build.
  if (dates.length === 0) {
    return null
  }

  // Earliest month across ALL collected dates (goal starts, goal
  // deadlines, and budget months), normalized to the 1st of the month
  // so day-of-month differences don't affect the comparison.
  const earliestTime = Math.min(
    ...dates.map(date =>
      new Date(date.getFullYear(), date.getMonth(), 1).getTime()
    )
  )

  // Latest deadline considers ONLY goal deadlines (not budget months or
  // goal start dates) — this is the point the simulation must run until.
  const latestTime = Math.max(
    ...goals.map(goal => new Date(goal.deadline).getTime())
  )

  return {
    earliest: new Date(earliestTime),
    latestDeadline: new Date(latestTime),
  }
}