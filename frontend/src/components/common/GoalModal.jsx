import { useState, useEffect, useRef } from "react"
import { useGoalStore } from "../../store/useGoalStore"
import useLockBodyScroll from "../../hooks/customHooks/useLockBodyScroll"
import { useIsMobile } from "../../hooks/customHooks/useIsMobile"

const GoalModal = ({ isOpen, onClose, onSave, goalType }) => {
  const [inputValue, setInputValue] = useState("")
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const inputRef = useRef(null)
  const modalRef = useRef(null)

  const { dailyGoalHours, dailyTodoGoal, weeklyTodoGoal, weeklyGoalHours } = useGoalStore()

  const isMobile = useIsMobile()

  useLockBodyScroll(isOpen)

  useEffect(() => {
    if (goalType === "study") setInputValue(dailyGoalHours.toString())
    if (goalType === "weekly_study") setInputValue(weeklyGoalHours.toString())
    if (goalType === "daily_todo") setInputValue(dailyTodoGoal.toString())
    if (goalType === "weekly_todo") setInputValue(weeklyTodoGoal.toString())
  }, [goalType, dailyGoalHours, dailyTodoGoal, weeklyTodoGoal, weeklyGoalHours])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }

  }, [isOpen])

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center  bg-slate-700/70 p-4 transition-transform duration-300"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="max-w-sm md:w-full rounded-2xl bg-base-100 p-6 shadow-xl absolute top-40"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-xl font-bold text-base-content-inverse">{getTitle()}</h3>
        <div className="mb-6 flex items-center space-x-2">
          <input
            ref={inputRef}
            type="number"
            min="0"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="no-spinners w-full rounded-md bg-base-200 p-2 text-center text-lg text-base-content-inverse focus:outline-none focus:ring-2 focus:ring-primary"
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
