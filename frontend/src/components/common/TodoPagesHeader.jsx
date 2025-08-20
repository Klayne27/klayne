import { useState } from "react"
import { BsThreeDotsVertical } from "react-icons/bs"
import { FaCheckSquare } from "react-icons/fa"
import { FaArrowLeft, FaEllipsisVertical } from "react-icons/fa6"
import { LuSquareActivity } from "react-icons/lu"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuthUser } from "../../hooks/authHooks/useAuthUser"
import useXpStore from "../../store/useXpStore"

const xpForLevel = (level) => {
  if (level <= 1) {
    return 500
  }
  return Math.floor(300 + level * 200 + Math.pow(level - 1, 1.3) * 100)
}

function TodoPagesHeader({ pageTitle }) {
  const navigate = useNavigate()
  const { authUser: currentUser } = useAuthUser()

  const { showXpGain, xpGainedAmount } = useXpStore()

  const { pathname } = useLocation()

  const [showDropdown, setShowDropdown] = useState(false)

  const { pomodoroXP, pomodoroLevel } = currentUser

  const xpNeededForNextLevel = xpForLevel(pomodoroLevel + 1)
  const xpProgress = (pomodoroXP / xpNeededForNextLevel) * 100

  const handleCompletedPageClick = (e) => {
    e.stopPropagation()
    navigate("/todos/completed")
    setShowDropdown(false)
  }

  const handleActivityLogPageClick = (e) => {
    e.stopPropagation()
    navigate("/todos/activity-log")
    setShowDropdown(false)
  }

  const handleToggleDropdown = (e) => {
    e.stopPropagation()
    setShowDropdown(!showDropdown)
  }

  const handleCloseDropdown = (e) => {
    e.stopPropagation()
    setShowDropdown(false)
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 px-1 py-1 pb-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2 transition duration-200 hover:bg-secondary"
          >
            <FaArrowLeft className="size-5" />
          </button>
          <h1 className="text-xl font-bold">{pageTitle}</h1>
        </div>

        <div className="">
          <button
            onClick={handleToggleDropdown}
            className="rounded-full p-[7px] transition duration-200 md:hover:bg-secondary"
          >
            <FaEllipsisVertical />
          </button>
          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-10 cursor-default bg-transparent"
                onClick={handleCloseDropdown}
              ></div>
              <ul className="white-shadow absolute right-2 top-3 z-20 w-40 rounded-xl bg-base-100 p-2">
                <li>
                  <button
                    onClick={handleCompletedPageClick}
                    className="flex w-full items-center gap-2 rounded-md p-2 transition-colors hover:bg-secondary"
                  >
                    <FaCheckSquare />
                    <span>Completed</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={handleActivityLogPageClick}
                    className="flex w-full items-center gap-2 rounded-md p-2 transition-colors hover:bg-secondary"
                  >
                    <LuSquareActivity />
                    <span>Activity Log</span>
                  </button>
                </li>
              </ul>
            </>
          )}
        </div>
      </div>
{!pathname.startsWith("/todos/") && (
  <div className="flex w-full items-center gap-4 px-4 pb-6">
    <p className="flex items-center text-sm font-semibold">
      Level {pomodoroLevel}
    </p>
    <div className="relative w-full">
      <div className="h-4 w-full overflow-hidden rounded-full bg-gray-700">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-in-out"
          style={{ width: `${Math.min(xpProgress, 100)}%` }}
        ></div>
      </div>
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-xs font-semibold text-white/90">
        {pomodoroXP} / {xpNeededForNextLevel} XP
      </span>
      {showXpGain && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 animate-fade-out text-sm font-bold text-primary">
          +{xpGainedAmount} XP
        </div>
      )}
    </div>
  </div>
)}
    </>
  )
}

export default TodoPagesHeader
