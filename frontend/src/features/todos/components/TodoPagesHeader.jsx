import { useState } from "react"
import { BsThreeDotsVertical } from "react-icons/bs"
import { FaCheckSquare } from "react-icons/fa"
import { FaArrowLeft, FaEllipsisVertical } from "react-icons/fa6"
import { LuSquareActivity } from "react-icons/lu"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import useXpStore from "../../../store/useXpStore"
import { RiCheckboxMultipleFill } from "react-icons/ri"
import { IoIosStats } from "react-icons/io"
import { shouldTextBeWhite } from "../../../utils/shouldTextBeWhite"
import { useTheme } from "../../../context/ThemeContext"

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
  const { theme } = useTheme()

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

  const handlePublicCompletedPageClick = (e) => {
    e.stopPropagation()
    navigate("/todos/public-completed")
    setShowDropdown(false)
  }

  const handleStatsPageClick = (e) => {
    e.stopPropagation()
    navigate("/study-dashboard")
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
    <div className="sticky top-0 z-40 bg-base-100">
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
              <ul
                style={{ animation: "fadeInSlideDown 0.2s ease-out forwards" }}
                className="white-shadow absolute right-3 top-9 z-20 w-52 rounded-xl bg-base-100 p-2"
              >
                <li>
                  <button
                    onClick={handleStatsPageClick}
                    className="flex w-full items-center gap-2 rounded-md p-2 transition-colors hover:bg-secondary"
                  >
                    <IoIosStats />
                    <span>My Stats</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={handlePublicCompletedPageClick}
                    className="flex w-full items-center gap-2 rounded-md p-2 transition-colors hover:bg-secondary"
                  >
                    <RiCheckboxMultipleFill />
                    <span>Public Completed</span>
                  </button>
                </li>
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
        <div className="flex w-full items-center gap-2 pb-6 pl-2 pr-4">
          <span className="inline-flex items-center rounded-md bg-secondary px-2 py-[1px]">
            <p className="flex items-center gap-1 text-xs font-semibold">
              Level <span>{pomodoroLevel}</span>
            </p>
          </span>
          <div className="relative w-full">
            <div className="h-4 w-full overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-in-out"
                style={{ width: `${Math.min(xpProgress, 100)}%` }}
              ></div>
            </div>
            <span
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${shouldTextBeWhite(theme)} font-mono text-xs font-semibold`}
            >
              {pomodoroXP} / {xpNeededForNextLevel} XP
            </span>
            {showXpGain && (
              <div className="absolute -top-5 right-3 animate-fade-out text-sm font-bold text-primary">
                +{xpGainedAmount} XP
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default TodoPagesHeader
