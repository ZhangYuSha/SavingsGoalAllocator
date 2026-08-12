import './GoalModal.css'

interface GoalWarning {
  name: string
  shortfall: number
}

interface GoalModalProps {
  open: boolean
  status: 'reachable' | 'unreachable'
  goals: GoalWarning[]
  onClose: () => void
  onContinue: () => void
}

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

            <button
              className="continue-button"
              onClick={onContinue}
            >
              View Allocation
            </button>
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

            <button
              className="close-button"
              onClick={onClose}
            >
              Reconsider Goals
            </button>
          </>

        )}

      </div>

    </div>
  )
}

export default GoalModal