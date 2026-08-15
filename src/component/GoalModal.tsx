import './GoalModal.css'
import Button from './Button'

/**
 * Represent a goal that unreachable.
 */
interface GoalWarning {
  name: string
  shortfall: number
}

/**
 * Property required by the GoalModal component.
 */
interface GoalModalProps {
  open: boolean
  status: 'reachable' | 'unreachable'
  goals: GoalWarning[]
  onClose: () => void
  onContinue: () => void
}

/**
 * 
 * @param open - Determine the goal visibility.
 * @param status - Determine the reachability of the goal.
 * @param goals - List unreachable goal.
 * @param onClose - Callback to close the modal.
 * @param onContinue - Callback when goal is visible to go to next page.
 * 
 * @returns the goal status modal or null when closed.
 */
function GoalModal({
  open,
  status,
  goals,
  onClose,
  onContinue,
}: GoalModalProps) {

  if (!open) {
    return null
  }

  return (
    <div className="modal-overlay">

      <div className="modal-box">

        {status === 'reachable' ? (

          <>
            <div className="success-icon">
              ✅
            </div>

            <h2>
              All Goals Are Reachable!
            </h2>

            <p>
              Your monthly savings plan is
              sufficient to achieve all of
              your goals before their deadlines.
            </p>

            <Button
              className="continue-button"
              text="View Allocation"
              onClick={onContinue}
            />
          </>

        ) : (

          <>
            <div className="warning-icon">
              ⚠️
            </div>

            <h2>
              Some Goals Are Not Reachable
            </h2>

            <p>
              Your current monthly savings
              plan cannot fully fund these goals.
            </p>

            <div className="unreachable-list">

              {goals.map(goal => (

                <div
                  className="goal-warning"
                  key={goal.name}
                >
                  <strong>
                    {goal.name}
                  </strong>

                  <br />

                  Shortfall:
                  {' '}
                  RM {goal.shortfall}
                </div>

              ))}

            </div>

            <Button
              className="close-button"
              text="Reconsider Goals"
              onClick={onClose}
            />
          </>

        )}

      </div>

    </div>
  )
}

export default GoalModal