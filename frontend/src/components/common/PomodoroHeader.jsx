import { Link } from "react-router-dom"
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
      <div className="flex flex-col items-center gap-4 border-b border-accent p-3 pb-3 md:p-4">
        {/* User Info Section */}

        {/* XP Progress and Level Section */}
        <div className="relative w-full">
          <div className="flex items-center gap-1">
            <div className="avatar">
              <Link to={`/profile/${username}`} className="h-10 w-10 overflow-hidden rounded-full">
                <img
                  src={profileImg?.imageUrl || "/avatar-placeholder.png"}
                  alt={`${fullName} avatar`}
                  className="h-full w-full object-cover"
                />
              </Link>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <h2 className="text-base font-bold sm:text-lg">{fullName}</h2>
                <img src={"/verified2.png"} className="size-[17px]" />
              </div>

              <span className="flex gap-1 self-start">
                {pomodoroLevel > 1 && (
                  <FaFire className={`text-sm ${getFireColor(pomodoroLevel)}`} />
                )}
                <span className="text-xs font-semibold text-slate-500">Level {pomodoroLevel}</span>
              </span>
            </div>
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
              <div className="absolute top-6 right-2 animate-fade-out text-sm font-bold text-primary">
                +{xpGainedAmount * 10} XP
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default PomodoroHeader
