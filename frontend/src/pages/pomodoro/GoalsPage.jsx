import { useState } from "react"
import { FaArrowLeft } from "react-icons/fa6"
import { useNavigate } from "react-router-dom"
import GoalModal from "../../components/common/GoalModal"
import { useGoalStore } from "../../store/useGoalStore"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import { useVacationMode } from "../../features/users/usersHooks/useUserMutations"

const GoalsPage = () => {
  const [modalOpen, setModalOpen] = useState(false)
  const [currentGoal, setCurrentGoal] = useState("")
  const navigate = useNavigate()

  const { vacationModeStatus, isLoading, isToggling, toggleVacationMode } =
    useVacationMode()

  const { updateGoal, dailyGoalHours, dailyTodoGoal, weeklyTodoGoal, weeklyGoalHours } =
    useGoalStore()

  const handleToggle = () => {
    toggleVacationMode(!vacationModeStatus)
  }

  const handleDivClick = (goal) => {
    setCurrentGoal(goal)
    setModalOpen(true)
  }

  const handleSave = (goalType, newValue) => {
    updateGoal(goalType, newValue)
    setModalOpen(false)
  }

  return (
    <div className="template mx-auto min-h-screen max-w-2xl md:border-x border-accent bg-base-100 py-4 font-sans">
      <div className="">
        <div className="mb-8 flex items-center space-x-4 px-4">
          <button onClick={() => navigate(-1)} className="template">
            <FaArrowLeft size={16} />
          </button>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>

        <div className="space-y-4 border-b border-accent py-2">
          <h2 className="px-4 font-bold text-primary">Set Goals</h2>
          <div
            className="cursor-pointer px-4 py-3 shadow-md transition-colors hover:bg-secondary"
            onClick={() => handleDivClick("study")}
          >
            <h2 className="text-lg font-semibold">Daily Study Goal</h2>
            <p className="text-neutral-400">{dailyGoalHours} hours</p>
          </div>
          <div
            className="cursor-pointer px-4 py-3 shadow-md transition-colors hover:bg-secondary"
            onClick={() => handleDivClick("weekly_study")}
          >
            <h2 className="text-lg font-semibold">Weekly Study Goal</h2>
            <p className="text-neutral-400">{weeklyGoalHours} hours</p>
          </div>
          <div
            className="cursor-pointer px-4 py-3 shadow-md transition-colors hover:bg-secondary"
            onClick={() => handleDivClick("daily_todo")}
          >
            <h2 className="text-lg font-semibold">Daily Task Goal</h2>
            <p className="text-neutral-400">{dailyTodoGoal} tasks</p>
          </div>
          <div
            className="cursor-pointer px-4 py-3 shadow-md transition-colors hover:bg-secondary"
            onClick={() => handleDivClick("weekly_todo")}
          >
            <h2 className="text-lg font-semibold">Weekly Task Goal</h2>
            <p className="text-neutral-400">{weeklyTodoGoal} tasks</p>
          </div>
        </div>

        {/* ⭐ New section for vacation mode toggle */}
        <div className="px-4 py-3 shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Vacation Mode</h2>
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  value=""
                  className="peer sr-only"
                  checked={vacationModeStatus}
                  onChange={handleToggle}
                  disabled={isToggling}
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-600 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white rtl:peer-checked:after:-translate-x-full"></div>
                <span className="ms-3 text-sm font-medium text-gray-400">
                  {vacationModeStatus ? "On" : "Off"}
                </span>
              </label>
            )}
          </div>

          {/* Brief message explaining the feature */}
          <p className="mt-2 text-sm text-gray-500">
            Enabling this mode will <strong>freeze your study streak</strong>, ensuring it doesn't
            break even if you don't study for more than 24 hours.
          </p>
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
