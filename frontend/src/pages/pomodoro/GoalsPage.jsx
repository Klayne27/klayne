import { useState } from "react"
import { FaArrowLeft } from "react-icons/fa6"
import { useNavigate } from "react-router-dom"
import GoalModal from "../../components/common/GoalModal"
import { useGoalStore } from "../../store/useGoalStore"

const GoalsPage = () => {
  const [modalOpen, setModalOpen] = useState(false)
  const [currentGoal, setCurrentGoal] = useState("")
  const navigate = useNavigate()

  // Get the update function from the store
  const { updateGoal, dailyGoalHours, dailyTodoGoal, weeklyTodoGoal, weeklyGoalHours } =
    useGoalStore()

  const handleDivClick = (goal) => {
    setCurrentGoal(goal)
    setModalOpen(true)
  }

  const handleSave = (goalType, newValue) => {
    // Call the Zustand action to update the goal
    updateGoal(goalType, newValue)
    setModalOpen(false)
  }

  return (
    <div className="min-h-screen bg-base-100 py-4 font-sans text-base-content-inverse">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 flex items-center space-x-4 px-4">
          <button onClick={() => navigate(-1)} className="text-base-content-inverse">
            <FaArrowLeft size={16} />
          </button>
          <h1 className="text-xl font-bold">Edit Goals</h1>
        </div>

        <div className="space-y-4 border-b border-accent py-2">
          <h2 className="px-4 text-primary font-bold">Set Goals</h2>
          <div
            className="cursor-pointer px-4 py-3 shadow-md transition-colors hover:bg-secondary"
            onClick={() => handleDivClick("study")}
          >
            <h2 className="text-xl font-semibold">Daily Study Goal</h2>
            <p className="text-neutral-400">{dailyGoalHours} hours</p>
          </div>
          <div
            className="cursor-pointer px-4 py-3 shadow-md transition-colors hover:bg-secondary"
            onClick={() => handleDivClick("weekly_study")} // ⭐ New goal type
          >
            <h2 className="text-xl font-semibold">Weekly Study Goal</h2>
            <p className="text-neutral-400">{weeklyGoalHours} hours</p>
          </div>
          <div
            className="px-4 shadow-md cursor-pointer py-3 transition-colors hover:bg-secondary"
            onClick={() => handleDivClick("daily_todo")}
          >
            <h2 className="text-xl font-semibold">Daily Task Goal</h2>
            <p className="text-neutral-400">{dailyTodoGoal} tasks</p>
          </div>
          <div
            className="cursor-pointer px-4 py-3 shadow-md transition-colors hover:bg-secondary"
            onClick={() => handleDivClick("weekly_todo")}
          >
            <h2 className="text-xl font-semibold">Weekly Task Goal</h2>
            <p className="text-neutral-400">{weeklyTodoGoal} tasks</p>
          </div>
        </div>
      </div>
      <GoalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        goalType={currentGoal}
      />
    </div>
  )
}

export default GoalsPage
