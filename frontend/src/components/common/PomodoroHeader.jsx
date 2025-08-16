import { useState } from "react"
import { Link } from "react-router-dom"
import { useAuthUser } from "../../hooks/authHooks/useAuthUser"
import LoadingSpinner from "../ui/LoadingSpinner"
import { FaFire } from "react-icons/fa6"
import { FaInfoCircle } from "react-icons/fa"

const xpForLevel = (level) => {
  if (level <= 1) {
    return 500
  }
  return Math.floor(300 + level * 200 + Math.pow(level - 1, 1.3) * 100)
}

const InfoModal = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-gray-800 p-6 text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-600 pb-3">
          <h3 className="text-xl font-bold">How Pomodoro Works</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 transition-colors hover:bg-gray-700"
          >
            <svg
              className="h-6 w-6 text-gray-400 hover:text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-300">
          <p>
            The Pomodoro Technique is a time management method that breaks down work into intervals,
            traditionally 25 minutes in length, separated by short breaks. Our timer is based on
            this principle, helping you stay focused and avoid burnout.
          </p>
          <div>
            <h4 className="font-semibold text-white">The XP Gaining System</h4>
            <p className="mt-1">
              Every minute you study earns you **XP (Experience Points)**. The amount of XP you get
              increases with the length of your session:
            </p>
            <ul className="mt-2 list-disc pl-5">
              <li>
                <strong>10 XP per minute</strong> for sessions up to 60 minutes.
              </li>
              <li>
                <strong>15 XP per minute</strong> for sessions longer than 60 minutes.
              </li>
              <li>
                <strong>20 XP per minute</strong> for sessions 120 minutes or longer.
              </li>
            </ul>
            <p className="mt-2">
              The XP you earn helps you level up, unlocking new milestones and showcasing your
              dedication.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white">Leaderboard Competition</h4>
            <p className="mt-1">
              See how you rank against other users on the platform! The leaderboard displays users
              based on their total study duration, creating a friendly competition to see who can be
              the most productive.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white">Badges and Rewards</h4>
            <p className="mt-1">
              Badges are special flair rewards for your profile, earned by achieving specific
              milestones. These include badges for your total study duration, total sessions
              completed, and study streaks. <strong>Badges are coming soon!</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const PomodoroHeader = ({ showXpGain, xpGainedAmount }) => {
  const { authUser: currentUser, isLoading } = useAuthUser()
  const [showInfoModal, setShowInfoModal] = useState(false)

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!currentUser) {
    return null
  }

  const { username, fullName, profileImg, pomodoroXP, pomodoroLevel } = currentUser

  const xpNeededForNextLevel = xpForLevel(pomodoroLevel + 1)
  const xpProgress = (pomodoroXP / xpNeededForNextLevel) * 100

  const getFireColor = (level) => {
    if (level <= 10) {
      return ""
    } else if (level <= 25) {
      return "text-yellow-700"
    } else if (level <= 50) {
      return "text-slate-400"
    } else if (level >= 51) {
      return "text-amber-400"
    }
  }

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
                </div>

                <span className="flex gap-1">
                  {pomodoroLevel > 1 && (
                    <FaFire className={`text-sm ${getFireColor(pomodoroLevel)}`} />
                  )}
                  <span className="text-xs font-semibold text-slate-500">
                    Level {pomodoroLevel}
                  </span>
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
      {showInfoModal && <InfoModal onClose={() => setShowInfoModal(false)} />}
    </header>
  )
}

export default PomodoroHeader
