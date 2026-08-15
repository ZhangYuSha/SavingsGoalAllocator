import './BudgetModal.css'

/**
 * Initialize the information required for displaying the budget
 */
interface BudgetModalProps {
  /** Controls modal visibility */
  open: boolean
  /** Month and year of the budget stated */
  month: string
  year: number
  /** Monthly spare cash */
  amount: number
  /** Function provided from parent component to close the modal */
  onClose: () => void
}

/**
 * Display confirmation modal afer monthly budget saved.
 * Modal shows the selected month, year, and spare cash amount, closeable.
 * 
 * @param open - Determined the modal visibility.
 * @param month - The month the budget saved.
 * @param year - The year the budget saved.
 * @param amount - Money spare amount.
 * @param onClose - Closing the modal
 * @returns budget confirmation modal, or null when closed.
 */
function BudgetModal({
  open,
  month,
  year,
  amount,
  onClose,
}: BudgetModalProps) {

  /** No modal render if it's closed */
  if (!open) {
    return null
  }

  return (
    <div className="budget-overlay">

      <div className="budget-box">

        <div className="budget-icon">
          💰
        </div>

        <h2>
          Budget Saved!
        </h2>

        <p>
          Your monthly spare cash for{' '}
          <strong>
            {month} {year}
          </strong>{' '}
          is:
        </p>

        <h3>
          RM {amount}
        </h3>

        <button onClick={onClose}>
          Continue
        </button>

      </div>

    </div>
  )
}

export default BudgetModal