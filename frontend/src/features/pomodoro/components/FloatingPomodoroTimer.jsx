import { FaPause, FaPlay } from "react-icons/fa"
import { Link } from "react-router-dom"
import FloatingPomodoroSkeleton from "../../../components/skeletons/FloatingPomodoroSkeleton"
import { usePomodoroTimerStore } from "../../../store/usePomodoroTimerStore"
import { usePauseSession, useStartSession } from "../pomodoroHooks/usePomodoroMutations"
import { useGetPomodoroSettings } from "../pomodoroHooks/usePomodoroQueries"
import { useSound } from "../../../hooks/customHooks/useSound"

const getPhaseDurationMinutes = (settings, isBreak, sessionCount) => {
  if (!settings) return 0
  if (!isBreak) return settings.sessionDuration
  const isLongBreak =
    sessionCount > 0 &&
    settings.sessionsBeforeLongBreak > 0 &&
    sessionCount % settings.sessionsBeforeLongBreak === 0
  return isLongBreak ? settings.longBreakDuration : settings.shortBreakDuration
}

const FloatingPomodoroTimer = () => {
  const timer = usePomodoroTimerStore((s) => s.timer)
  const isActive = usePomodoroTimerStore((s) => s.isActive)
  const isBreak = usePomodoroTimerStore((s) => s.isBreak)
  const sessionCount = usePomodoroTimerStore((s) => s.sessionCount)
  const isGoalReached = usePomodoroTimerStore((s) => s.isGoalReached)
  const selectedTaskId = usePomodoroTimerStore((s) => s.selectedTaskId)
  const setIsActive = usePomodoroTimerStore((s) => s.setIsActive)
  const persistPause = usePomodoroTimerStore((s) => s.persistPause)

  const { play: playPlay } = useSound("/sounds/click-001.mp3", 1)


  const { settings, isSettingsLoading } = useGetPomodoroSettings()
  const { startSession } = useStartSession()
  const { pauseServerSession } = usePauseSession()

  if (isSettingsLoading) return <FloatingPomodoroSkeleton />
  if (!settings || (timer === 0 && !isActive && !isGoalReached)) return null

  const minutes = Math.floor(timer / 60)
  const seconds = Math.floor(timer % 60)
  const totalDuration = getPhaseDurationMinutes(settings, isBreak, sessionCount) * 60
  const progress = totalDuration ? Math.min(1, Math.max(timer / totalDuration, 0)) : 0

  // Same radius/viewBox as the main PomodoroTimerDisplay circle
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const glow = isBreak ? "rgba(45,212,191,0.5)" : "oklch(var(--p) / 0.5)"
  const glowFilter = isBreak
    ? "drop-shadow(0 0 4px rgba(45,212,191,0.5))"
    : "drop-shadow(0 0 4px oklch(var(--p) / 0.5))"

  const handleToggle = (event) => {
    event.preventDefault()
    playPlay()
    if (timer <= 0 || isGoalReached) return
    if (isActive) {
      setIsActive(false)
      persistPause(timer)
      pauseServerSession({ remainingSeconds: timer })
      return
    }
    startSession({
      timerSeconds: timer,
      plannedDurationMinutes: getPhaseDurationMinutes(settings, isBreak, sessionCount),
      isBreak,
      sessionCount,
      taskId: selectedTaskId || null,
    })
  }

  return (
    <div className="mt-2 rounded-2xl border border-accent bg-base-100 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pomodoro</span>
        <Link to="/pomodoro" className="text-xs text-primary hover:underline">
          Open
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {/* ── Timer circle ── */}
        <div className="relative h-12 w-12 shrink-0">
          {/* Glow blob behind SVG */}
          <div
            className="absolute inset-1 rounded-full opacity-20 blur-[10px]"
            style={{ backgroundColor: isBreak ? "rgb(45,212,191)" : "oklch(var(--p))" }}
          />
          <svg
            className="h-full w-full -rotate-90 overflow-visible"
            style={{ filter: `drop-shadow(0 0 6px ${glow})` }}
            viewBox="0 0 100 100"
          >
            {/* Track ring */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="6"
              className="stroke-secondary"
            />
            {/* Progress arc */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              className={isBreak ? "stroke-teal-400" : "stroke-primary"}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: circumference * (1 - progress),
                transition: "stroke-dashoffset 1s linear, stroke 0.7s ease",
                filter: glowFilter,
              }}
            />
          </svg>
          {/* Centered countdown */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-[10px] font-black tabular-nums tracking-tighter">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="flex-1">
          <p className={`text-sm font-bold ${isBreak ? "text-teal-400" : "text-primary"}`}>
            {isGoalReached ? "Goal Reached! 🎉" : isBreak ? "Break Time" : "Focus Time"}
          </p>
          <p className="text-xs text-slate-500">
            Session {sessionCount}
            {settings.sessionGoalCount ? ` / ${settings.sessionGoalCount}` : ""}
          </p>
        </div>

        <button
          onClick={handleToggle}
          disabled={timer <= 0 || isGoalReached}
          className={`rounded-full p-2 transition ${
            isActive ? "text-teal-400 hover:bg-teal-400/10" : "text-primary hover:bg-primary/10"
          } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {isActive ? <FaPause size={16} /> : <FaPlay size={16} />}
        </button>
      </div>
    </div>
  )
}

export default FloatingPomodoroTimer
