import { calculateMonths } from './dateUtils'

/**
 * Calculates the average amount that needs to be
 * saved per eligible calendar month.
 *
 * IMPORTANT:
 *
 * This is only a planning figure.
 * It does NOT limit the actual allocation.
 *
 * The actual allocator can save more in one month
 * and less in another because unused money can
 * carry forward.
 */
export function calculateMonthlySaving(
  targetAmount: number,
  startDate: string,
  deadline: string
): number {

  const months = calculateMonths(
    startDate,
    deadline
  )

  if (months <= 0) {
    return targetAmount
  }

  return Math.ceil(
    targetAmount / months
  )
}