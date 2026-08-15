/**
 * Represents the amount of spare cash
 * available for a specific month.
 */
export interface MonthlyBudget {

  // Unique identifier for the monthly budget.
  id: number

  // Numeric month value (0 = January, 11 = December).
  month: number

  // Year of the monthly budget.
  year: number

  // Amount of spare cash available for the month.
  amount: number
}