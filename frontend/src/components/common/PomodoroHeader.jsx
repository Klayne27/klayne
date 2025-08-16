import { useState } from "react"
import { Link } from "react-router-dom"
import { useAuthUser } from "../../hooks/authHooks/useAuthUser"
import LoadingSpinner from "../ui/LoadingSpinner"
import { FaFire } from "react-icons/fa6"
import { FaInfoCircle } from "react-icons/fa"
import { renderHourBadge, renderSessionBadge, renderStreakBadge } from "../../utils/renderBadges"

const xpForLevel = (level) => {
  if (level <= 1) {
    return 500
  }
  return Math.floor(300 + level * 200 + Math.pow(level - 1, 1.3) * 100)
}

const PomodoroHeader = ({ showXpGain, xpGainedAmount, setShowInfoModal }) => {
  const { authUser: currentUser, isLoading } = useAuthUser()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!currentUser) {
    return null
  }

  const { username, fullName, profileImg, pomodoroXP, pomodoroLevel, badges } = currentUser

  const xpNeededForNextLevel = xpForLevel(pomodoroLevel + 1)
  const xpProgress = (pomodoroXP / xpNeededForNextLevel) * 100

  // const getFireColor = (level) => {
  //   if (level <= 10) {
  //     return ""
  //   } else if (level <= 25) {
  //     return "text-yellow-700"
  //   } else if (level <= 50) {
  //     return "text-slate-400"
  //   } else if (level >= 51) {
  //     return "text-amber-400"
  //   }
  // }

  return (
    <header className="w-full">
      <div className="flex flex-col items-center gap-4 border-b border-accent p-3 pb-3 md:p-4">
        <div className="relative w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <div className="avatar">
                <Link
                  to={`/profile/${username}`}
                  className="h-10 w-10 overflow-hidden rounded-full"
                >
                  <img
                    src={profileImg?.imageUrl || "/avatar-placeholder.png"}
                    alt={`${fullName} avatar`}
                    className="h-full w-full object-cover"
                  />
                </Link>
              </div>

              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1">
                  <h2 className="text-base font-bold sm:text-lg">{fullName}</h2>
                  <img src={"/verified2.png"} className="size-[17px]" />
                  {renderHourBadge(badges)}
                  {renderSessionBadge(badges)}
                  {renderStreakBadge(badges)}
                </div>

                <span className="inline-flex items-center gap-1 rounded-md bg-secondary py-[1px] px-2">
                  <span className="text-xs font-semibold text-slate-500">Level {pomodoroLevel}</span>
                  {/* {pomodoroLevel >= 0 && (
                    <FaFire className={`text-sm ${getFireColor(pomodoroLevel)}`} />
                  )} */}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowInfoModal(true)}
              className="rounded-full p-2 text-white transition-colors hover:bg-gray-700 focus:outline-none"
              aria-label="How it works info"
            >
              <FaInfoCircle className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-2 w-full">
            <div className="relative h-4 overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-in-out"
                style={{ width: `${Math.min(xpProgress, 100)}%` }}
              >
                <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-semibold text-white/90">
                  {pomodoroXP} / {xpNeededForNextLevel} XP
                </span>
              </div>
            </div>
            {showXpGain && (
              <div className="absolute right-2 top-6 animate-fade-out text-sm font-bold text-primary">
                +{xpGainedAmount} XP
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default PomodoroHeader
