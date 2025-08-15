// components/PomodoroHeader.jsx
import { useEffect, useRef, useState } from "react"
import { useAuthUser } from "../../hooks/authHooks/useAuthUser"
import LoadingSpinner from "../ui/LoadingSpinner"
import { FaFire } from "react-icons/fa"

// A helper function to calculate XP needed for the next level
const xpForLevel = (level) => {
  if (level <= 1) {
    return 1500
  }
  return Math.floor(2000 * Math.pow(level - 1, 1.5))
}

const PomodoroHeader = () => {
  const { authUser: currentUser, isLoading, initialData } = useAuthUser()
  const [xpChange, setXpChange] = useState(0)

  // Set the initial XP state to prevent animation on first load
  const prevXpRef = useRef()

  useEffect(() => {
    // If we have user data, but haven't stored a previous value yet,
    // store the initial XP value in our ref and do nothing else.
    if (currentUser && prevXpRef.current === undefined) {
      prevXpRef.current = currentUser.pomodoroXP
      return
    } // On subsequent renders, if the new XP is greater than our stored previous XP...

    if (currentUser && currentUser.pomodoroXP > prevXpRef.current) {
      const newXp = currentUser.pomodoroXP - prevXpRef.current
      setXpChange(newXp) // Trigger the animation
      // IMPORTANT: Update the ref with the new value for the next comparison.

      prevXpRef.current = currentUser.pomodoroXP

      const timer = setTimeout(() => {
        setXpChange(0)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [currentUser])
  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!currentUser) {
    return null
  }

  const { username, fullName, profileImg, pomodoroXP, pomodoroLevel } = currentUser
  const xpNeededForNextLevel = xpForLevel(pomodoroLevel)
  const xpProgress = (pomodoroXP / xpNeededForNextLevel) * 100

  return (
    <header className="w-full">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-xl sm:flex-row sm:items-center md:p-6">
        {/* User Info Section */}
        <div className="flex items-center gap-4">
          <div className="avatar">
            <div className="h-16 w-16 overflow-hidden rounded-full ring-2 ring-primary ring-offset-2 ring-offset-gray-900">
              <img
                src={profileImg?.imageUrl || "/avatar-placeholder.png"}
                alt={`${fullName} avatar`}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold tracking-tight text-white">{fullName}</h2>
            <p className="mt-0.5 text-sm font-medium text-gray-400">@{username}</p>
          </div>
        </div>

        {/* XP Progress and Level Section */}
        <div className="relative flex w-full flex-col items-start sm:w-auto">
          <div className="mb-2 flex items-center gap-2">
            <FaFire className="text-lg text-orange-400" />
            <span className="text-sm font-semibold text-gray-300">Level {pomodoroLevel}</span>
          </div>

          <div className="w-full sm:w-64">
            <div className="h-2 overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-in-out"
                style={{ width: `${Math.min(xpProgress, 100)}%` }} // Ensure progress doesn't exceed 100%
              ></div>
            </div>
            <div className="mt-1 flex justify-between font-mono text-xs text-gray-500">
              <span>{pomodoroXP} XP</span>
              <span>
                {xpNeededForNextLevel} XP to Level {pomodoroLevel + 1}
              </span>
            </div>
          </div>

          {/* XP Change Notification UI */}
          {xpChange > 0 && (
            <div className="animate-fade-out absolute -top-0 right-0 translate-x-1/2 transform md:left-auto md:right-10 md:translate-x-0">
              <span className="text-lg font-bold tracking-wide text-primary">+ {xpChange} XP</span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default PomodoroHeader
