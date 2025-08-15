import { useAuthUser } from "../../hooks/authHooks/useAuthUser"
import LoadingSpinner from "../ui/LoadingSpinner"
import { FaFire } from "react-icons/fa"

const xpForLevel = (level) => {
  if (level <= 1) {
    return 500 
  }
  return Math.floor(300 + level * 200 + Math.pow(level - 1, 1.3) * 100)
}

const PomodoroHeader = ({ showXpGain, xpGainedAmount }) => {
  const { authUser: currentUser, isLoading } = useAuthUser()

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
      <div className="flex items-center justify-between gap-4 border-b border-accent p-3 pb-3 md:p-4">
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
            {pomodoroLevel > 0 && <FaFire className={`text-sm ${getFireColor(pomodoroLevel)}`} />}
            {/* Fixed: Display actual level without adding +1 */}
            <span className="text-xs font-semibold text-gray-300">Level {pomodoroLevel}</span>
          </div>

          {showXpGain && (
            <div className="animate-fade-out absolute right-3 top-5 text-xs font-bold text-primary">
              +{xpGainedAmount * 10} XP
            </div>
          )}

          <div className="mt-1 w-full">
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-in-out"
                style={{ width: `${Math.min(xpProgress, 100)}%` }}
              ></div>
            </div>

            <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500 md:text-xs">
              {/* Fixed: Show progress toward next level */}
              <span>
                {pomodoroXP} / {xpNeededForNextLevel} XP - Level {pomodoroLevel + 1}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default PomodoroHeader
