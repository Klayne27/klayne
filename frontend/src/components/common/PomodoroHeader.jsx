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
  const { authUser: currentUser, isLoading } = useAuthUser()

  const { username, fullName, profileImg, pomodoroXP, pomodoroLevel } = currentUser
  const xpNeededForNextLevel = xpForLevel(pomodoroLevel)
  const xpProgress = (pomodoroXP / xpNeededForNextLevel) * 100

  const getFireColor = (level) => {
    if (level <= 5) {
      return "text-yellow-700"
    } else if (level <= 10) {
      return "text-slate-400"
    } else if (level >= 11) {
      return "text-amber-400"
    }
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!currentUser) {
    return null
  }

  return (
    <header className="w-full">
      <div className="flex items-center justify-between gap-4 border-b border-accent px-4 pb-3 sm:p-4">
        {/* User Info Section */}
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="h-10 w-10 overflow-hidden rounded-full">
              <img
                src={profileImg?.imageUrl || "/avatar-placeholder.png"}
                alt={`${fullName} avatar`}
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <h2 className="text-base font-bold text-white sm:text-lg">{fullName}</h2>
            <p className="text-xs font-medium text-slate-500">@{username}</p>
          </div>
        </div>
        {/* XP Progress and Level Section */}
        <div className="flex w-full flex-col items-start">
          <div className="flex items-center gap-1">
            <FaFire className={`text-sm ${getFireColor(pomodoroLevel)}`} />
            <span className="text-xs font-semibold text-gray-300">Level {pomodoroLevel}</span>
          </div>

          <div className="mt-1 w-full">
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-in-out"
                style={{ width: `${Math.min(xpProgress, 100)}%` }}
              ></div>
            </div>

            <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
              <span>{pomodoroXP} XP</span>
              <span>{xpNeededForNextLevel}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default PomodoroHeader
