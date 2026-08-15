import { calculateMonths } from './dateUtils'


/**
 * Calculates the average amount that needs to be saved
 * per eligible calendar month to reach a savings goal.
 *
 * This value is used as a planning figure only. It does
 * not restrict the actual allocation of money between
 * months. The allocator may allocate different amounts
 * per month because unused budget can carry forward.
 *
 * @param targetAmount - Total amount required for the goal.
 * @param startDate - Date from which saving can begin.
 * @param deadline - Date by which the goal should be reached.
 * @returns The minimum whole-number monthly saving amount
 * needed to reach the target across the available months.
 */
export function calculateMonthlySaving(
  targetAmount: number,
  startDate: string,
  deadline: string
): number {


  /*
   * Calculate the number of eligible calendar months,
   * including both the starting and deadline months.
   */
  const months = calculateMonths(
    startDate,
    deadline
  )


  /*
   * If the date range is invalid or contains no usable
   * months, return the full target amount as the planning
   * amount rather than dividing by zero.
   */
  if (months <= 0) {
    return targetAmount
  }


  /*
   * Divide the target across the available months.
   *
   * Math.ceil() ensures the monthly planning amount is
   * always high enough to reach the target rather than
   * leaving a fractional amount unpaid.
   */
  return Math.ceil(
    targetAmount / months
  )
}