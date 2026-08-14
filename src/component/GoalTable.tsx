import type { Goal } from '../types/goal'

import {
  calculateMonthlySaving,
} from '../logic/goalCalculator'

interface GoalTableProps {
  goals: Goal[]
  onDelete: (id: number) => void
}

function GoalTable({
  goals,
  onDelete,
}: GoalTableProps) {

  return (
    <table>

      <thead>

        <tr>

          <th>
            Priority
          </th>

          <th>
            Goal
          </th>

          <th>
            Start
          </th>

          <th>
            Deadline
          </th>

          <th>
            Required Monthly Savings
          </th>

          <th>
            Total
          </th>

          <th>
            Action
          </th>

        </tr>

      </thead>

      <tbody>

        {goals.map(goal => {

          const monthlySaving =
            calculateMonthlySaving(
              goal.targetAmount,
              goal.startDate,
              goal.deadline
            )

          return (

            <tr key={goal.id}>

              <td>
                {'⭐'.repeat(
                  goal.priority
                )}
              </td>

              <td>
                {goal.name}
              </td>

              <td>
                {goal.startDate}
              </td>

              <td>
                {goal.deadline}
              </td>

              <td>
                RM {monthlySaving}
              </td>

              <td>
                RM {goal.targetAmount}
              </td>

              <td>

                <button
                  type="button"
                  onClick={() =>
                    onDelete(
                      goal.id
                    )
                  }
                >
                  Delete
                </button>

              </td>

            </tr>
          )
        })}

      </tbody>

    </table>
  )
}

export default GoalTable