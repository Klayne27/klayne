import { Link } from "react-router-dom"
import { FaInfoCircle, FaBolt } from "react-icons/fa"
import { useAuthUser } from "../../auth/authHooks/useAuthUser.js"
import { IoIosStats } from "react-icons/io"
import { getBadgeIcon } from "../../../utils/badgeUtils.jsx"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils.js"
import { Tooltip } from "react-tooltip" // 1. Import Tooltip
import { useRef, useState } from "react"
import { LuImagePlay } from "react-icons/lu"
import PomodoroBackgroundPicker from "./PomodoroBackgroundPicker.jsx"

const xpForLevel = (level) => {
  if (level <= 1) return 500
  return Math.floor(300 + level * 200 + Math.pow(level - 1, 1.3) * 100)
}

const PomodoroHeader = ({ showXpGain, xpGainedAmount, setShowInfoModal }) => {
  const { authUser: currentUser } = useAuthUser()
  const [showBgPicker, setShowBgPicker] = useState(false)
  const bgBtnRef = useRef(null)
  const hasBackground = !!(currentUser.pomodoroBackground || currentUser.pomodoroBackgroundUrl)


  if (!currentUser) return null

  const {
    username,
    fullName,
    profileImg,
    pomodoroXP,
    pomodoroLevel,
    isVerified,
    isGoldVerified,
    preferredBadge,
    pomodoroBackground,
    pomodoroBackgroundUrl
  } = currentUser

  const xpNeededForNextLevel = xpForLevel(pomodoroLevel + 1)
  const xpProgress = (pomodoroXP / xpNeededForNextLevel) * 100

    const isBackgroundPicked = pomodoroBackgroundUrl || pomodoroBackground


  return (
    <header className="sticky top-0 z-50 flex w-full justify-center border-accent/20 bg-transparent backdrop-blur-sm">
      <div className="flex w-full max-w-2xl flex-col gap-3 px-4 py-3">
        {/* Top Row: Profile & Actions */}
        <div className="flex items-center justify-between">
          {/* User Info Group */}
          <div className="flex items-center gap-3">
            <Link
              to={`/profile/${username}`}
              className="group relative shrink-0"
              data-tooltip-id="header-tooltip"
              data-tooltip-content="View Profile"
            >
              <div className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-primary to-accent opacity-0 blur-sm transition duration-500 group-hover:opacity-40"></div>
              <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-base-300">
                <img
                  src={getOptimizedImageUrl(
                    profileImg?.imageUrl || "/avatar-placeholder.png",
                    "avatar",
                  )}
                  alt={fullName}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
            </Link>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <h2 className={`${isBackgroundPicked ? "text-slate-400" :""} transition duration-300 text-sm font-black tracking-tight`}>{fullName}</h2>
                <div className="flex items-center gap-1">
                  {isVerified && <img src="/verified2.png" className="size-3.5" alt="v" />}
                  {isGoldVerified && (
                    <img src="/gold-verified2.png" className="size-3.5" alt="gv" />
                  )}
                  {preferredBadge && (
                    <div className="mb-1 size-3.5 flex-shrink-0 opacity-80">
                      {getBadgeIcon(preferredBadge)}
                    </div>
                  )}
                </div>
              </div>

              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary">
                <FaBolt className="text-[8px]" />
                Level {pomodoroLevel}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Link
              to="/study-dashboard"
              data-tooltip-id="header-tooltip"
              data-tooltip-content="Statistics"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/50 bg-white/5 text-slate-400 transition-all hover:bg-secondary/50"
            >
              <IoIosStats size={18} />
            </Link>
            <button
              onClick={() => setShowInfoModal(true)}
              data-tooltip-id="header-tooltip"
              data-tooltip-content="How it works"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/50 bg-white/5 text-slate-400 transition-all hover:bg-secondary/50"
            >
              <FaInfoCircle size={17} />
            </button>
            <div className="relative">
              <button
                ref={bgBtnRef}
                onClick={() => setShowBgPicker((v) => !v)}
                data-tooltip-id="header-tooltip"
                data-tooltip-content="Background"
                className={`flex h-9 w-9 items-center justify-center rounded-xl border border-accent/50 bg-white/5 text-slate-400 transition-all hover:bg-secondary/50 ${
                  hasBackground ? "border-primary/40 text-primary" : ""
                }`}
              >
                <LuImagePlay size={17} />
              </button>

              <PomodoroBackgroundPicker
                isOpen={showBgPicker}
                onClose={() => setShowBgPicker(false)}
                anchorRef={bgBtnRef}
              />
            </div>
          </div>
        </div>

        {/* Bottom Row: XP Bar */}
        <div className="relative px-1 pt-1">
          <div className="relative h-2 overflow-hidden rounded-full border border-white/5 bg-slate-800/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(xpProgress, 100)}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between px-0.5">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-600">
              Progress
            </span>
            <span className="font-mono text-[9px] font-bold text-slate-500">
              {pomodoroXP} <span className="opacity-40">/</span> {xpNeededForNextLevel}
            </span>
          </div>
          {showXpGain && (
            <div className="absolute -top-2 right-0 animate-bounce text-[10px] font-black text-primary">
              +{xpGainedAmount} XP
            </div>
          )}
        </div>
      </div>

      {/* Global Header Tooltip Configuration */}
      <Tooltip
        id="header-tooltip"
        place="bottom"
        className="!z-[100] !rounded-lg !px-2 !py-1 !text-[10px] font-bold tracking-wide shadow-2xl"
      />
    </header>
  )
}

export default PomodoroHeader
