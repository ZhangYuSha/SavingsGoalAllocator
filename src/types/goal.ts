/**
 * Represents a savings goal entered by the user.
 */
export interface Goal {

  // Unique identifier for the savings goal.
  id: number

  // Priority level assigned to the goal.
  priority: number

  // Name of the savings goal.
  name: string

  // Date when the user starts saving for the goal.
  startDate: string

  // Date by which the goal should be completed.
  deadline: string

  // Total amount of money required to reach the goal.
  targetAmount: number
}