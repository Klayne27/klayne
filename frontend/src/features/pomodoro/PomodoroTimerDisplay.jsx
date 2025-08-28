import { FaRedo } from "react-icons/fa"
import { showAppToast } from "../../utils/showAppToast"
import { useGetPomodoroSettings } from "./pomodoroHooks/useGetPomodoroSettings"
import { useUpdatePomodoroSettings } from "./pomodoroHooks/useUpdatePomodoroSettings"
import { FaBell, FaBellSlash, FaForward } from "react-icons/fa6"
import { RxReset } from "react-icons/rx"

function PomodoroTimerDisplay({
  isBreak,
  timer,
  setIsActive,
  startNextTimer,
  sessionCount,
  setShowResetCurrentSessionModal,
  isGoalReached,
  onSessionEnd,
}) {
  const { updateSettings } = useUpdatePomodoroSettings()
  const { settings } = useGetPomodoroSettings()

  const handleSkipBreak = () => {
    if (isBreak) {
      // Stop the current timer
      setIsActive(false)
      // Directly start the next study session
      startNextTimer(true, sessionCount, false)
      showAppToast("Break skipped!", "info")
    }
  }

  const handleResetCurrentSessionClick = () => {
    setShowResetCurrentSessionModal(true)
  }

  const toggleMute = () => {
    const newSettings = { ...settings, isMuted: !settings.isMuted }
    updateSettings(newSettings)
    showAppToast(settings.isMuted ? "Alarm unmuted" : "Alarm muted")
  }

  const minutes = Math.floor(timer / 60)
  const seconds = Math.floor(timer % 60)
  let totalDuration = 25 * 60
  if (settings) {
    const isCurrentBreakLong =
      isBreak &&
      sessionCount > 0 &&
      settings.sessionsBeforeLongBreak > 0 &&
      sessionCount % settings.sessionsBeforeLongBreak === 0
    totalDuration = isBreak
      ? (isCurrentBreakLong ? settings.longBreakDuration : settings.shortBreakDuration) * 60
      : settings.sessionDuration * 60
  }
  const progress = totalDuration ? Math.max(timer / totalDuration, 0) : 0
  const radius = 45
  const circumference = 2 * Math.PI * radius

  const now = new Date()
  const finishTime = new Date(now.getTime() + timer * 1000) // Add remaining seconds to current time
  // Format the finish time

  const finishTimeOptions = {
    hour: "numeric",
    minute: "2-digit",
    // hour12: false
  }
  const formattedFinishTime = finishTime.toLocaleTimeString([], finishTimeOptions)

  return (
    <>
      <div
        className={`${minutes === 0 && seconds < 10 && !isGoalReached && "animate-pulse"} relative h-64 w-64 md:h-72 md:w-72`}
      >
        <div className="absolute inset-0 bottom-[28px] z-50 flex flex-col items-center justify-end font-mono tracking-tighter md:bottom-8">
          <span
            className="flex cursor-pointer items-center gap-1 rounded-full p-2 text-slate-500"
            onClick={handleResetCurrentSessionClick}
          >
            <span>
              <RxReset size={20} strokeWidth={0.5} />
            </span>
          </span>
        </div>
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="8"
            className="stroke-slate-700"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={`transition-colors duration-500 ease-linear ${isBreak ? "stroke-teal-400" : "stroke-primary"}`}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: circumference * (1 - progress),
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-6xl tracking-tighter md:text-7xl">
            {isGoalReached
              ? "00:00"
              : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}
          </span>
        </div>
        <div className="absolute inset-0 bottom-[62px] flex flex-col items-center justify-end font-mono tracking-tighter md:bottom-[70px]">
          <span
            className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1"
            onClick={toggleMute}
          >
            <span>{!settings.isMuted ? <FaBell /> : <FaBellSlash />}</span> {formattedFinishTime}
          </span>
        </div>
      </div>
      <div className="relative flex flex-col items-center gap-2">
        <p className="text-sm uppercase tracking-widest text-slate-400">
          Session {isGoalReached ? settings.sessionGoalCount : sessionCount} /{" "}
          {settings?.sessionGoalCount || " ∞"}
        </p>
        {settings?.sessionGoalCount > 0 && (
          <div className="flex gap-2">
            {Array.from({ length: settings.sessionGoalCount }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${i < sessionCount ? (isBreak ? "bg-teal-400" : "bg-primary") : "bg-slate-600"}`}
              />
            ))}
          </div>
        )}
        {isBreak && !isGoalReached && (
          <button
            onClick={handleSkipBreak}
            className="absolute -right-20 -top-10 flex h-12 w-12 items-center justify-center rounded-full text-slate-500 transition-all hover:text-white disabled:cursor-not-allowed disabled:opacity-50 md:hover:bg-slate-700/50"
            aria-label="Skip break"
          >
            <FaForward size={20} />
          </button>
        )}
        {!isBreak && !isGoalReached && minutes <= 0 && seconds <= 0 && (
          <button
            onClick={onSessionEnd}
            className="absolute -right-20 -top-10 flex h-12 w-12 items-center justify-center rounded-full text-slate-500 transition-all hover:text-white disabled:cursor-not-allowed disabled:opacity-50 md:hover:bg-slate-700/50"
          >
            <FaForward size={20} />
          </button>
        )}
      </div>
    </>
  )
}

export default PomodoroTimerDisplay
