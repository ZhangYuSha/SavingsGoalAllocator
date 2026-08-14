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

function DataInput() {

  const navigate = useNavigate()

  const currentYear =
    new Date().getFullYear()

  // -----------------------------
  // MONTHLY BUDGET
  // -----------------------------

  const [
    budgetMonth,
    setBudgetMonth
  ] = useState(
    new Date().getMonth()
  )

  const [
    budgetYear,
    setBudgetYear
  ] = useState(currentYear)

  const [
    spareCash,
    setSpareCash
  ] = useState('')

  const [
    monthlyBudgets,
    setMonthlyBudgets
  ] = useState<MonthlyBudget[]>([])

  const [
    showBudgetModal,
    setShowBudgetModal
  ] = useState(false)

  // -----------------------------
  // GOALS
  // -----------------------------

  const [
    goals,
    setGoals
  ] = useState<Goal[]>([])

  const [
    showGoalModal,
    setShowGoalModal
  ] = useState(false)

  const [
    allocationStatus,
    setAllocationStatus
  ] = useState<
    'reachable' | 'unreachable'
  >('reachable')

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

  const saveMonthlyCash = () => {

    if (!spareCash) {
      return
    }

    const amount =
      Number(spareCash)

    if (amount < 0) {
      return
    }

    const existing =
      monthlyBudgets.find(
        budget =>
          budget.month === budgetMonth &&
          budget.year === budgetYear
      )

    if (existing) {

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

      const newBudget: MonthlyBudget = {

        id: Date.now(),

        month: budgetMonth,

        year: budgetYear,

        amount,

      }

      setMonthlyBudgets([
        ...monthlyBudgets,
        newBudget,
      ])
    }

    setSpareCash('')

    setShowBudgetModal(true)
  }

  // -----------------------------
  // ADD GOAL
  // -----------------------------

  const addGoal = (
    name: string,
    targetAmount: number,
    startDate: string,
    deadline: string,
    priority: number
  ) => {

    const newGoal: Goal = {

      id: Date.now(),

      name,

      targetAmount,

      startDate,

      deadline,

      priority

    }

    setGoals([
      ...goals,
      newGoal,
    ])
  }

  // -----------------------------
  // DELETE GOAL
  // -----------------------------

  const deleteGoal = (
    id: number
  ) => {

    setGoals(
      goals.filter(
        goal => goal.id !== id
      )
    )
  }

  // -----------------------------
  // CHECK ALLOCATION
  // -----------------------------

  const checkAllocation = async () => {

    if (goals.length === 0) {
      return
    }

    if (monthlyBudgets.length === 0) {
      return
    }

    const {
      generateAllocation,
    } = await import(
      '../../logic/allocationEngine'
    )

    const {
      PriorityAllocationStrategy,
    } = await import(
      '../../logic/PriorityAllocationStrategy'
    )

    const strategy =
      new PriorityAllocationStrategy()

    const results =
      generateAllocation(
        goals,
        monthlyBudgets,
        strategy
      )

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

      setAllocationStatus(
        'unreachable'
      )

      setUnreachableGoals(
        unreachable
      )

    } else {

      setAllocationStatus(
        'reachable'
      )

      setUnreachableGoals([])
    }

    setShowGoalModal(true)
  }

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

      <button
        className="back-button"
        onClick={() =>
          navigate('/')
        }
      >
        ← Back to Home
      </button>

      {/* ========================= */}
      {/* PAGE TITLE */}
      {/* ========================= */}

      <h1>
        Savings Goal Allocator
      </h1>

      {/* ========================= */}
      {/* MONTHLY BUDGET */}
      {/* ========================= */}

      <div className="card">

        <h2>
          Monthly Spare Cash
        </h2>

        <div className="dateSelector">

          <select
            value={budgetMonth}
            onChange={e =>
              setBudgetMonth(
                Number(e.target.value)
              )
            }
          >

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

          <select
            value={budgetYear}
            onChange={e =>
              setBudgetYear(
                Number(e.target.value)
              )
            }
          >

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

      <div className="card">

        <h2>
          Monthly Budget Plan
        </h2>

        {monthlyBudgets.length === 0 ? (

          <p>
            No monthly budgets added yet.
          </p>

        ) : (

          <table>

            <thead>

              <tr>

                <th>Month</th>

                <th>Year</th>

                <th>Spare Cash</th>

              </tr>

            </thead>

            <tbody>

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

                    <td>
                      {
                        monthNames[
                          budget.month
                        ]
                      }
                    </td>

                    <td>
                      {budget.year}
                    </td>

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

      <GoalForm
        onAddGoal={addGoal}
      />


      {/* ========================= */}
      {/* GOAL TABLE */}
      {/* ========================= */}

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

      <BudgetModal
        open={showBudgetModal}

        month={
          monthNames[
            budgetMonth
          ]
        }

        year={budgetYear}

        amount={
          monthlyBudgets.find(
            budget =>
              budget.month ===
                budgetMonth &&
              budget.year ===
                budgetYear
          )?.amount ?? 0
        }

        onClose={() =>
          setShowBudgetModal(false)
        }
      />


      {/* ========================= */}
      {/* GOAL MODAL */}
      {/* ========================= */}

      <GoalModal
        open={showGoalModal}

        status={
          allocationStatus
        }

        goals={
          unreachableGoals
        }

        onClose={() =>
          setShowGoalModal(false)
        }

        onContinue={() => {

          setShowGoalModal(false)

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