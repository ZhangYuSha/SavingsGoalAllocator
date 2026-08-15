import type { Goal } from '../types/goal'

import {
  calculateMonthlySaving,
} from '../logic/goalCalculator'

import Button from './Button'


/**
 * Props required by the GoalTable component.
 *
 * @property goals - List of savings goals to display.
 * @property onDelete - Callback used to delete a goal by its ID.
 */
interface GoalTableProps {
  goals: Goal[]
  onDelete: (id: number) => void
}


/**
 * Displays the user's savings goals in a table.
 *
 * Each goal shows its priority, name, dates, required monthly
 * savings, target amount, and a delete action.
 *
 * The required monthly savings are calculated from the goal's
 * target amount, start date, and deadline.
 *
 * @param goals - Savings goals to display in the table.
 * @param onDelete - Callback used when the user deletes a goal.
 * @returns A table containing the user's savings goals.
 */
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

          /*
           * Calculate the amount that needs to be saved
           * each month to reach the goal by its deadline.
           */
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

                <Button
                  text="Delete"
                  onClick={() =>
                    onDelete(
                      goal.id
                    )
                  }
                />

              </td>

            </tr>
          )
        })}

      </tbody>

    </table>
  )
}

export default GoalTable