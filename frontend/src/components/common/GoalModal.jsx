import { useState, useEffect, useRef } from "react"
import { useGoalStore } from "../../store/useGoalStore"

const GoalModal = ({ isOpen, onClose, onSave, goalType }) => {
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef(null)
  // Get the goal values from the store
  const { dailyGoalHours, dailyTodoGoal, weeklyTodoGoal, weeklyGoalHours } = useGoalStore()

  useEffect(() => {
    // Set the initial value from the store based on goalType
    if (goalType === "study") setInputValue(dailyGoalHours.toString())
    if (goalType === "weekly_study") setInputValue(weeklyGoalHours.toString())

    if (goalType === "daily_todo") setInputValue(dailyTodoGoal.toString())
    if (goalType === "weekly_todo") setInputValue(weeklyTodoGoal.toString())

    inputRef.current?.focus()
  }, [goalType, dailyGoalHours, dailyTodoGoal, weeklyTodoGoal, weeklyGoalHours])

  if (!isOpen) return null

  const getTitle = () => {
    if (goalType === "study") return "Set Daily Study Goal"
    if (goalType === "weekly_study") return "Set Weekly Study Goal"
    if (goalType === "daily_todo") return "Set Daily Task Goal"
    if (goalType === "weekly_todo") return "Set Weekly Task Goal"
    return "Set Goal"
  }

  const getLabel = () => {
    if (goalType === "study" || goalType === "weekly_study") return "hours"
    return "tasks"
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-700/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-base-200 p-6 shadow-xl">
        <h3 className="mb-4 text-xl font-bold text-base-content-inverse">{getTitle()}</h3>
        <div className="mb-6 flex items-center space-x-2">
          <input
            ref={inputRef}
            type="number"
            min="0"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full rounded-md bg-base-300 p-2 text-center text-lg text-base-content-inverse focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-neutral-400">{getLabel()}</span>
        </div>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-neutral-400 transition-colors hover:bg-neutral-700"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(goalType, inputValue)}
            className="rounded-md bg-primary px-4 py-2 font-semibold text-white transition-colors hover:bg-primary/85"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

export default GoalModal
