import { showAppToast } from "../../../utils/showAppToast"
import { FaBell, FaBellSlash, FaForward } from "react-icons/fa6"
import { RxReset } from "react-icons/rx"
import { useUpdatePomodoroSettings } from "../pomodoroHooks/usePomodoroMutations"
import { useGetPomodoroSettings } from "../pomodoroHooks/usePomodoroQueries"
import { Tooltip } from "react-tooltip" // 1. Import Tooltip
import QuoteWidget from "./QuoteWidget"
import { useSound } from "../../../hooks/customHooks/useSound"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { usePomodoroBackgroundStore } from "../../../store/usePomodoroBackgroundStore"

function PomodoroTimerDisplay({
  isBreak,
  timer,
  sessionCount,
  setShowResetCurrentSessionModal,
  isGoalReached,
  onSessionEnd,
  timerState,
}) {
  const { updateSettings } = useUpdatePomodoroSettings()
  const { settings } = useGetPomodoroSettings()
  const {authUser} = useAuthUser()
  const activePreset = usePomodoroBackgroundStore((s) => s.presetKey)
  const activeCustomUrl = usePomodoroBackgroundStore((s) => s.customImageUrl)

  const { play: playClick } = useSound("/sounds/click-004.mp3", 1)

  const toggleMute = () => {
    updateSettings({ ...settings, isMuted: !settings.isMuted })
    showAppToast(settings.isMuted ? "Alarm unmuted" : "Alarm muted")
  }

  const minutes = Math.floor(timer / 60)
  const seconds = Math.floor(timer % 60)

  let totalDuration = 25 * 60
  if (settings) {
    const isLong =
      isBreak &&
      sessionCount > 0 &&
      settings.sessionsBeforeLongBreak > 0 &&
      sessionCount % settings.sessionsBeforeLongBreak === 0
    totalDuration = isBreak
      ? (isLong ? settings.longBreakDuration : settings.shortBreakDuration) * 60
      : settings.sessionDuration * 60
  }

  const progress = totalDuration ? Math.max(timer / totalDuration, 0) : 0
  const radius = 44
  const circumference = 2 * Math.PI * radius

  const finishTime = new Date(Date.now() + timer * 1000).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })

  const handleSkipAction = () => {
    onSessionEnd()
    showAppToast(isBreak ? "Break skipped!" : "Session skipped", isBreak ? "info" : "warning")
  }

  const handleResetSessionClick = () => {
    playClick()
    setShowResetCurrentSessionModal(true)
  }

  const isUrgent = minutes === 0 && seconds < 10 && !isGoalReached
  const showSkip = !isGoalReached && (isBreak || (minutes <= 0 && seconds <= 0))

  const ringColor = isGoalReached
    ? "stroke-slate-600"
    : isBreak
      ? "stroke-teal-400"
      : "stroke-primary"

  const hasBackground = !!(activePreset || activeCustomUrl)

  return (
    <div className="relative flex flex-col items-center gap-6">
      <div className={`relative h-64 w-64 md:h-80 md:w-80 ${isUrgent ? "animate-pulse" : ""}`}>
        <div
          className="absolute inset-4 rounded-full opacity-20 blur-[60px] transition-colors duration-1000"
          style={{ backgroundColor: timerState.color.replace("text-", "") }}
        />

        <svg
          className="h-full w-full -rotate-90 overflow-visible rounded-full backdrop-blur-sm"
          style={{ filter: `drop-shadow(0 0 20px ${timerState.glow})` }}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="1.5"
            className="stroke-secondary"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            className={`transition-all duration-700 ${ringColor}`}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: circumference * (1 - progress),
              transition: "stroke-dashoffset 1s linear, stroke 0.7s ease",
              filter: `drop-shadow(0 0 8px ${timerState.glow})`,
            }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-mono text-6xl font-black tabular-nums tracking-tighter md:text-7xl duration transition-300 ${hasBackground ? "text-slate-400" : ""}`}
          >
            {isGoalReached
              ? "00:00"
              : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}
          </span>

          <div className="mt-2 flex flex-col items-center gap-3">
            {/* Finish Time / Mute Toggle */}
            <button
              onClick={toggleMute}
              data-tooltip-id="display-tooltip"
              data-tooltip-content={settings?.isMuted ? "Unmute Alarm" : "Mute Alarm"}
              className="flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.05] px-4 py-1.5 text-[10px] font-black text-slate-400 backdrop-blur-sm transition-all hover:bg-white/[0.1] hover:text-white"
            >
              {settings?.isMuted ? <FaBellSlash size={10} /> : <FaBell size={10} />}
              <span className="uppercase tracking-widest">{finishTime}</span>
            </button>

            {/* Sub-Controls Row */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleResetSessionClick}
                data-tooltip-id="display-tooltip"
                data-tooltip-content="Reset Session"
                className="group flex flex-col items-center gap-1 text-slate-600 transition-all hover:text-slate-400"
              >
                <RxReset
                  size={18}
                  className="transition-transform duration-500 group-hover:rotate-180"
                />
                <span className="text-[8px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100">
                  Reset
                </span>
              </button>

              {showSkip && (
                <button
                  onClick={handleSkipAction}
                  data-tooltip-id="display-tooltip"
                  data-tooltip-content={isBreak ? "Skip Break" : "Emergency Skip"}
                  className="group flex flex-col items-center gap-1 text-primary transition-all hover:scale-110"
                >
                  <FaForward size={18} className="animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-tighter">Skip</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Dots */}
      <div className="flex flex-col items-center gap-3">
        {settings?.sessionGoalCount > 0 && (
          <div
            className="flex items-center gap-4 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 shadow-xl backdrop-blur-sm"
            data-tooltip-id="display-tooltip"
            data-tooltip-content={`Goal: ${sessionCount} of ${settings.sessionGoalCount} sessions`}
          >
            <div className="flex gap-2">
              {Array.from({ length: settings.sessionGoalCount }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full border border-gray-300 transition-all duration-700 ease-out ${
                    i < sessionCount
                      ? isBreak
                        ? "bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.5)]"
                        : "bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
                      : "bg-white/50"
                  } ${i === sessionCount && !isGoalReached ? "scale-125 animate-pulse ring-2 ring-white/20" : ""}`}
                />
              ))}
            </div>
            <div className="h-3 w-[1px] bg-gray-300" />
            <div className="flex items-baseline gap-0.5 font-mono text-xs font-medium tracking-wider">
              <span className={isBreak ? "text-teal-400" : "text-primary"}>{sessionCount}</span>
              <span className="text-gray-500">/</span>
              <span className="text-gray-500">{settings.sessionGoalCount}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tooltip Instance for Display Area */}
      <Tooltip
        id="display-tooltip"
        place="top"
        className="!z-[100] !rounded-lg !px-2.5 !py-1 !text-[10px] font-bold shadow-2xl"
      />

      {/* <QuoteWidget /> */}
    </div>
  )
}

export default PomodoroTimerDisplay
