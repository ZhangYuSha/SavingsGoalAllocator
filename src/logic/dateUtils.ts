/**
 * Calculates the number of calendar months between a start date
 * and a deadline, counting both the starting and ending months.
 *
 * For example:
 * August -> August = 1 month
 * August -> September = 2 months
 * August -> December = 5 months
 *
 * @param startDate - Starting date in string format.
 * @param deadline - Ending date in string format.
 * @returns Number of calendar months inclusively, or 0 if either
 * date is invalid or the deadline is before the start date.
 */
export function calculateMonths(
  startDate: string,
  deadline: string
): number {

  const start = new Date(startDate)
  const end = new Date(deadline)


  /*
   * Check whether either date is invalid.
   *
   * getTime() returns NaN for an invalid Date object.
   */
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return 0
  }


  /*
   * A deadline earlier than the start date is invalid,
   * so no valid month range exists.
   */
  if (end < start) {
    return 0
  }


  /*
   * Calculate the difference in calendar months.
   *
   * Years are converted to months and then the month
   * difference is added.
   *
   * +1 makes the range inclusive of both the start
   * and deadline months.
   */
  const months =
    (
      end.getFullYear() -
      start.getFullYear()
    ) * 12 +
    (
      end.getMonth() -
      start.getMonth()
    ) +
    1


  /*
   * Ensure that a valid date range always represents
   * at least one month.
   */
  return Math.max(1, months)
}


/**
 * Calculates the number of calendar months between two dates
 * without counting the starting month inclusively.
 *
 * For example:
 * August -> September = 1 month
 * August -> December = 4 months
 *
 * @param startDate - Starting date in string format.
 * @param endDate - Ending date in string format.
 * @returns Number of calendar months between the two dates.
 */
export function getMonthDifference(
  startDate: string,
  endDate: string
): number {

  const start = new Date(startDate)
  const end = new Date(endDate)


  /*
   * Convert the year difference to months and add
   * the difference between the calendar months.
   */
  return (
    (
      end.getFullYear() -
      start.getFullYear()
    ) * 12 +
    (
      end.getMonth() -
      start.getMonth()
    )
  )
}


/**
 * Converts a numeric month and year into a readable
 * month-year string.
 *
 * JavaScript Date months use zero-based indexing:
 * 0 = January, 1 = February, ..., 11 = December.
 *
 * @param month - Zero-based month index from 0 to 11.
 * @param year - Year to display.
 * @returns Formatted month and year, such as "August 2026".
 */
export function formatMonthYear(
  month: number,
  year: number
): string {

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]


  /*
   * Use the month number as an index into the month
   * names array.
   */
  return `${months[month]} ${year}`
}