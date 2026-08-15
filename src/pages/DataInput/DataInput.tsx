import './DataInput.css'

import { useState } from 'react'

import Button from '../../component/Button'
import BudgetModal from '../../component/BudgetModal'
import GoalForm from '../../component/GoalForm'
import GoalTable from '../../component/GoalTable'
import GoalModal from '../../component/GoalModal'

import type { Goal } from '../../types/goal'
import type { MonthlyBudget } from '../../types/monthlyBudget'

import { useNavigate } from 'react-router-dom'

// Main page for entering monthly budgets and savings goals,
// then generating an allocation plan.
function DataInput() {

  // Used to navigate between pages.
  const navigate = useNavigate()

  // Gets the current year for the default budget year.
  const currentYear =
    new Date().getFullYear()

  // -----------------------------
  // MONTHLY BUDGET
  // -----------------------------

  // Stores the selected month for the monthly budget.
  // JavaScript months are zero-based: January = 0.
  const [
    budgetMonth,
    setBudgetMonth
  ] = useState(
    new Date().getMonth()
  )

  // Stores the selected year for the monthly budget.
  const [
    budgetYear,
    setBudgetYear
  ] = useState(currentYear)

  // Stores the spare cash entered by the user as text
  // before it is converted into a number.
  const [
    spareCash,
    setSpareCash
  ] = useState('')

  // Stores all monthly budgets entered by the user.
  const [
    monthlyBudgets,
    setMonthlyBudgets
  ] = useState<MonthlyBudget[]>([])

  // Controls whether the budget confirmation modal is displayed.
  const [
    showBudgetModal,
    setShowBudgetModal
  ] = useState(false)

  // -----------------------------
  // GOALS
  // -----------------------------

  // Stores all savings goals created by the user.
  const [
    goals,
    setGoals
  ] = useState<Goal[]>([])

  // Controls whether the goal allocation result modal is displayed.
  const [
    showGoalModal,
    setShowGoalModal
  ] = useState(false)

  // Stores whether all goals can be reached
  // using the available monthly budgets.
  const [
    allocationStatus,
    setAllocationStatus
  ] = useState<
    'reachable' | 'unreachable'
  >('reachable')

  // Stores goals that cannot be reached,
  // together with their required shortfall.
  const [
    unreachableGoals,
    setUnreachableGoals
  ] = useState<
    {
      name: string
      shortfall: number
    }[]
  >([])

  // -----------------------------
  // SAVE MONTHLY BUDGET
  // -----------------------------

  // Saves or updates the spare cash for the selected month and year.
  const saveMonthlyCash = () => {

    // Do nothing if the input is empty.
    if (!spareCash) {
      return
    }

    // Convert the entered amount from text to a number.
    const amount =
      Number(spareCash)

    // Prevent negative budget values.
    if (amount < 0) {
      return
    }

    // Check whether a budget already exists
    // for the selected month and year.
    const existing =
      monthlyBudgets.find(
        budget =>
          budget.month === budgetMonth &&
          budget.year === budgetYear
      )

    if (existing) {

      // Update the existing budget instead of creating a duplicate.
      setMonthlyBudgets(
        monthlyBudgets.map(
          budget =>
            budget.id === existing.id
              ? {
                  ...budget,
                  amount,
                }
              : budget
        )
      )

    } else {

      // Create a new monthly budget when one does not already exist.
      const newBudget: MonthlyBudget = {

        // Uses the current timestamp as a simple unique ID.
        id: Date.now(),

        month: budgetMonth,

        year: budgetYear,

        amount,

      }

      // Add the new budget to the existing budget list.
      setMonthlyBudgets([
        ...monthlyBudgets,
        newBudget,
      ])
    }

    // Clear the input after saving.
    setSpareCash('')

    // Display the budget confirmation modal.
    setShowBudgetModal(true)
  }

  // -----------------------------
  // ADD GOAL
  // -----------------------------

  /**
   * Adds a new savings goal to the goal list.
   *
   * @param name Name of the savings goal.
   * @param targetAmount Amount of money required to reach the goal.
   * @param startDate Date from which the goal starts.
   * @param deadline Date by which the goal should be completed.
   * @param priority Priority level of the goal.
   */
  const addGoal = (
    name: string,
    targetAmount: number,
    startDate: string,
    deadline: string,
    priority: number
  ) => {

    // Create a new Goal object using the supplied information.
    const newGoal: Goal = {

      // Uses the current timestamp as a simple unique ID.
      id: Date.now(),

      name,

      targetAmount,

      startDate,

      deadline,

      priority

    }

    // Add the new goal to the existing goals.
    setGoals([
      ...goals,
      newGoal,
    ])
  }

  // -----------------------------
  // DELETE GOAL
  // -----------------------------

  /**
   * Deletes a savings goal from the goal list.
   *
   * @param id ID of the goal to delete.
   */
  const deleteGoal = (
    id: number
  ) => {

    // Keep every goal except the one with the matching ID.
    setGoals(
      goals.filter(
        goal => goal.id !== id
      )
    )
  }

  // -----------------------------
  // CHECK ALLOCATION
  // -----------------------------

  // Runs the allocation algorithm and checks
  // whether all savings goals are reachable.
  const checkAllocation = async () => {

    // Allocation cannot be performed without any goals.
    if (goals.length === 0) {
      return
    }

    // Allocation cannot be performed without any monthly budgets.
    if (monthlyBudgets.length === 0) {
      return
    }

    // Dynamically imports the allocation engine.
    // This loads the allocation logic only when it is needed.
    const {
      generateAllocation,
    } = await import(
      '../../logic/allocationEngine'
    )

    // Dynamically imports the priority allocation strategy.
    const {
      PriorityAllocationStrategy,
    } = await import(
      '../../logic/PriorityAllocationStrategy'
    )

    // Creates the strategy used to determine
    // how available money should be allocated.
    const strategy =
      new PriorityAllocationStrategy()

    // Generates the allocation results
    // for all goals and monthly budgets.
    const results =
      generateAllocation(
        goals,
        monthlyBudgets,
        strategy
      )

    // Extracts only goals that cannot be reached
    // and records how much money they are short by.
    const unreachable =
      results
        .filter(
          result =>
            !result.reachable
        )
        .map(result => ({
          name: result.goalName,
          shortfall: result.shortfall,
        }))

    if (
      unreachable.length > 0
    ) {

      // At least one goal cannot be reached.
      setAllocationStatus(
        'unreachable'
      )

      // Store the unreachable goals
      // so they can be displayed in the modal.
      setUnreachableGoals(
        unreachable
      )

    } else {

      // All goals can be reached.
      setAllocationStatus(
        'reachable'
      )

      // Clear any previous unreachable-goal results.
      setUnreachableGoals([])
    }

    // Show the allocation result modal.
    setShowGoalModal(true)
  }

  // Names used to display the numeric month values as text.
  const monthNames = [

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

  return (

    <div className="container">

      {/* ========================= */}
      {/* BACK BUTTON */}
      {/* ========================= */}

      {/* Returns the user to the home page. */}
      <Button className="back-button" onClick={() => navigate('/DataInput')}>
        <span className="back-arrow">←</span>
        Back to Goals
      </Button>

      {/* ========================= */}
      {/* PAGE TITLE */}
      {/* ========================= */}

      {/* Main heading for the page. */}
      <h1>
        Savings Goal Allocator
      </h1>

      {/* ========================= */}
      {/* MONTHLY BUDGET */}
      {/* ========================= */}

      {/* Section for entering monthly spare cash. */}
      <div className="card">

        <h2>
          Monthly Spare Cash
        </h2>

        {/* Allows the user to select the budget month and year. */}
        <div className="dateSelector">

          {/* Month selector. */}
          <select
            value={budgetMonth}
            onChange={e =>
              setBudgetMonth(
                Number(e.target.value)
              )
            }
          >

            {/* Generate an option for each month. */}
            {monthNames.map(
              (month, index) => (

                <option
                  key={month}
                  value={index}
                >
                  {month}
                </option>

              )
            )}

          </select>

          {/* Year selector. */}
          <select
            value={budgetYear}
            onChange={e =>
              setBudgetYear(
                Number(e.target.value)
              )
            }
          >

            {/* Generate options for the current year
                and the following nine years. */}
            {Array.from(
              {
                length: 10,
              },
              (_, index) => {

                const year =
                  currentYear + index

                return (

                  <option
                    key={year}
                    value={year}
                  >
                    {year}
                  </option>

                )

              }
            )}

          </select>

        </div>

        {/* Input for the amount of spare cash. */}
        <input
          type="number"
          min="0"
          placeholder="Spare cash for this month"
          value={spareCash}
          onChange={e =>
            setSpareCash(
              e.target.value
            )
          }
        />

        {/* Saves the entered monthly budget. */}
        <Button
          text="Save Monthly Budget"
          onClick={
            saveMonthlyCash
          }
        />

      </div>


      {/* ========================= */}
      {/* SAVED BUDGETS */}
      {/* ========================= */}

      {/* Displays all monthly budgets that have been saved. */}
      <div className="card">

        <h2>
          Monthly Budget Plan
        </h2>

        {monthlyBudgets.length === 0 ? (

          // Message shown when no budgets exist.
          <p>
            No monthly budgets added yet.
          </p>

        ) : (

          // Table displaying the saved monthly budgets.
          <table>

            <thead>

              <tr>

                <th>Month</th>

                <th>Year</th>

                <th>Spare Cash</th>

              </tr>

            </thead>

            <tbody>

              {/* Create a sorted copy of the budget list
                  so the original state is not modified. */}
              {[
                ...monthlyBudgets,
              ]
                .sort(
                  (a, b) =>
                    a.year - b.year ||
                    a.month - b.month
                )
                .map(budget => (

                  <tr
                    key={budget.id}
                  >

                    {/* Display the month name. */}
                    <td>
                      {
                        monthNames[
                          budget.month
                        ]
                      }
                    </td>

                    {/* Display the budget year. */}
                    <td>
                      {budget.year}
                    </td>

                    {/* Display the spare cash amount. */}
                    <td>
                      RM {budget.amount}
                    </td>

                  </tr>

                ))}

            </tbody>

          </table>

        )}

      </div>


      {/* ========================= */}
      {/* GOAL FORM */}
      {/* ========================= */}

      {/* Form used to create new savings goals. */}
      <GoalForm
        onAddGoal={addGoal}
      />


      {/* ========================= */}
      {/* GOAL TABLE */}
      {/* ========================= */}

      {/* Displays the currently created savings goals. */}
      <div className="card">

        <h2>
          Savings Goals
        </h2>

        <GoalTable
          goals={goals}
          onDelete={deleteGoal}
        />

      </div>


      {/* ========================= */}
      {/* GENERATE */}
      {/* ========================= */}

      {/* Starts the allocation process.
          The button is disabled until at least one goal
          and one monthly budget have been entered. */}
      <Button
        text="Generate Allocation"
        onClick={
          checkAllocation
        }
        disabled={
          goals.length === 0 ||
          monthlyBudgets.length === 0
        }
      />


      {/* ========================= */}
      {/* BUDGET MODAL */}
      {/* ========================= */}

      {/* Shows confirmation/details for the saved budget. */}
      <BudgetModal
        open={showBudgetModal}

        // Converts the selected month number into its name.
        month={
          monthNames[
            budgetMonth
          ]
        }

        year={budgetYear}

        // Finds the saved budget for the selected month and year.
        // Uses 0 if no matching budget is found.
        amount={
          monthlyBudgets.find(
            budget =>
              budget.month ===
                budgetMonth &&
              budget.year ===
                budgetYear
          )?.amount ?? 0
        }

        // Closes the budget modal.
        onClose={() =>
          setShowBudgetModal(false)
        }
      />


      {/* ========================= */}
      {/* GOAL MODAL */}
      {/* ========================= */}

      {/* Displays whether the goals can be reached
          with the available monthly budgets. */}
      <GoalModal
        open={showGoalModal}

        // Indicates whether the allocation is reachable
        // or whether some goals have a shortfall.
        status={
          allocationStatus
        }

        // Passes unreachable goals to the modal.
        goals={
          unreachableGoals
        }

        // Closes the allocation result modal.
        onClose={() =>
          setShowGoalModal(false)
        }

        // Continues to the allocation page
        // when the user chooses to proceed.
        onContinue={() => {

          setShowGoalModal(false)

          // Navigate to the allocation page
          // while passing the goals and budgets through route state.
          navigate('/allocation', {

            state: {

              goals,

              monthlyBudgets,

            },

          })

        }}

      />

    </div>
  )
}

export default DataInput