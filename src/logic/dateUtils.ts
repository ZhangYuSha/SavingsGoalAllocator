export function calculateMonths(
  startDate: string,
  deadline: string
): number {

  const start = new Date(startDate)
  const end = new Date(deadline)

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return 0
  }

  if (end < start) {
    return 0
  }

  /*
   * Count calendar months inclusively.
   *
   * Examples:
   *
   * August -> August
   * = 1 month
   *
   * August -> September
   * = 2 months
   *
   * August -> December
   * = 5 months
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

  return Math.max(1, months)
}

export function getMonthDifference(
  startDate: string,
  endDate: string
): number {

  const start = new Date(startDate)
  const end = new Date(endDate)

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

  return `${months[month]} ${year}`
}