import { useState } from 'react'

import Button from './Button'

/**
 * Defines callback needed from the parent component to receive newly created savings goal.
 */
interface GoalFormProps {
  /** Happen when user submits a valid goal */
  onAddGoal: (
    name: string,
    targetAmount: number,
    startDate: string,
    deadline: string,
    priority: number
  ) => void
}

/**
 * Handles savings goal form.
 * @param onAddgoal - Callback used to submit validated goal. 
 * @returns The savings goal form UI.
 */
function GoalForm({
  onAddGoal,
}: GoalFormProps) {

  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [startDate, setStartDate] = useState('')
  const [deadline, setDeadline] = useState('')
  const [priority, setPriority] = useState(5)

  const handleSubmit = () => {

    /**
     * Prevent submission if required field empty.
     */
    if (
      !name ||
      !targetAmount ||
      !startDate ||
      !deadline
    ) {
      return
    }

    /**
     * Validate the target amount and date range.
     * 
     * Target > 0
     * Deadline can not occur before start date
     */
    if (
      Number(targetAmount) <= 0 ||
      new Date(deadline) < new Date(startDate)
    ) {
      return
    }

    /**
     * Pass validated goal information to parent.
     * 
     * target amount converted to number.
     */
    onAddGoal(
      name,
      Number(targetAmount),
      startDate,
      deadline,
      priority
    )

    /**
     * Reset form once submit
     */
    setName('')
    setTargetAmount('')
    setStartDate('')
    setDeadline('')
    setPriority(5)
  }

  return (
    <div className="card">

      <h2>
        Add Savings Goal
      </h2>

      <input
        placeholder="Goal Name"
        value={name}
        onChange={e =>
          setName(e.target.value)
        }
      />

      <input
        type="number"
        min="1"
        placeholder="Target Amount"
        value={targetAmount}
        onChange={e =>
          setTargetAmount(e.target.value)
        }
      />

      <label>
        Start Date
      </label>

      <input
        type="date"
        value={startDate}
        onChange={e =>
          setStartDate(e.target.value)
        }
      />

      <label>
        Deadline
      </label>

      <input
        type="date"
        value={deadline}
        onChange={e =>
          setDeadline(e.target.value)
        }
      />

      <label>
        Priority
      </label>

      <select
        value={priority}
        onChange={e =>
          setPriority(Number(e.target.value))
        }
      >
        <option value={1}>
          1 - Lowest
        </option>

        <option value={2}>
          2
        </option>

        <option value={3}>
          3
        </option>

        <option value={4}>
          4
        </option>

        <option value={5}>
          5 - Highest
        </option>
      </select>

      <Button
        text="Add Goal"
        onClick={handleSubmit}
      />

    </div>
  )
}

export default GoalForm