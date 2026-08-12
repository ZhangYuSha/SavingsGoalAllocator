import { useState } from 'react'

import Button from './Button'

interface GoalFormProps {
  onAddGoal: (
    name: string,
    targetAmount: number,
    startDate: string,
    deadline: string,
    priority: number
  ) => void
}

function GoalForm({
  onAddGoal,
}: GoalFormProps) {

  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [startDate, setStartDate] = useState('')
  const [deadline, setDeadline] = useState('')
  const [priority, setPriority] = useState(5)

  const handleSubmit = () => {

    if (
      !name ||
      !targetAmount ||
      !startDate ||
      !deadline
    ) {
      return
    }

    if (
      Number(targetAmount) <= 0 ||
      new Date(deadline) < new Date(startDate)
    ) {
      return
    }

    onAddGoal(
      name,
      Number(targetAmount),
      startDate,
      deadline,
      priority
    )

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