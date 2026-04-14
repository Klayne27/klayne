import { Link } from "react-router-dom"
import { FaInfoCircle } from "react-icons/fa"
import { useAuthUser } from "../../auth/authHooks/useAuthUser.js"
import { IoIosStats } from "react-icons/io"
import { getBadgeIcon } from "../../../utils/badgeUtils.jsx"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils.js"

const xpForLevel = (level) => {
  if (level <= 1) {
    return 500
  }
  return Math.floor(300 + level * 200 + Math.pow(level - 1, 1.3) * 100)
}

const PomodoroHeader = ({ showXpGain, xpGainedAmount, setShowInfoModal }) => {
  const { authUser: currentUser } = useAuthUser()

  if (!currentUser) {
    return null
  }

  const {
    username,
    fullName,
    profileImg,
    pomodoroXP,
    pomodoroLevel,
    badges,
    isVerified,
    isGoldVerified,
    preferredBadge,
    isCha
  } = currentUser

  const xpNeededForNextLevel = xpForLevel(pomodoroLevel + 1)
  const xpProgress = (pomodoroXP / xpNeededForNextLevel) * 100

  return (
    <header className="sticky top-0 z-50 w-full bg-base-100">
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
                    src={getOptimizedImageUrl(
                      profileImg?.imageUrl || "/avatar-placeholder.png",
                      "avatar",
                    )}
                    alt={`${fullName} avatar`}
                    className="h-full w-full object-cover"
                  />
                </Link>
              </div>

              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1">
                  <h2 className="ml-1 text-base font-bold sm:text-lg">{fullName}</h2>
                  {isVerified && <img src="/verified2.png" className="size-[17px]" />}
                  {isGoldVerified && <img src="/gold-verified2.png" className="size-[17px]" />}
                  {isCha && <img src="/cha.png" className="size-[15px] rounded-md" />}
                  {preferredBadge && (
                    <div className="ml-1 size-[17px] flex-shrink-0">
                      {getBadgeIcon(preferredBadge)}
                    </div>
                  )}
                </div>

                <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-[1px]">
                  <span className="text-xs font-semibold text-slate-500">
                    Level {pomodoroLevel}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex gap-1">
              <Link
                to="/study-dashboard"
                className="template rounded-full p-2 transition-colors hover:bg-gray-700 hover:text-white focus:outline-none"
              >
                <IoIosStats className="h-5 w-5" />
              </Link>

              <button
                onClick={() => setShowInfoModal(true)}
                className="template rounded-full p-2 transition-colors hover:bg-gray-700 hover:text-white focus:outline-none"
                aria-label="How it works info"
              >
                <FaInfoCircle className="h-5 w-5" />
              </button>
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
