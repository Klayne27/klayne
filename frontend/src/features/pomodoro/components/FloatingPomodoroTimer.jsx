import { FaPause, FaPlay } from "react-icons/fa"
import { Link } from "react-router-dom"
import { useGetPomodoroSettings } from "../pomodoroHooks/usePomodoroQueries"
import { usePomodoroTimerStore } from "../../../store/usePomodoroTimerStore"

const FloatingPomodoroTimer = () => {
  const timer = usePomodoroTimerStore((s) => s.timer)
  const isActive = usePomodoroTimerStore((s) => s.isActive)
  const isBreak = usePomodoroTimerStore((s) => s.isBreak)
  const sessionCount = usePomodoroTimerStore((s) => s.sessionCount)
  const isGoalReached = usePomodoroTimerStore((s) => s.isGoalReached)

  const setIsActive = usePomodoroTimerStore((s) => s.setIsActive)
  const persistPause = usePomodoroTimerStore((s) => s.persistPause)

  const { settings } = useGetPomodoroSettings()

  const minutes = Math.floor(timer / 60)
  const seconds = Math.floor(timer % 60)

  const totalDuration = settings
    ? (() => {
        if (!isBreak) return settings.sessionDuration * 60
        const isLong =
          sessionCount > 0 &&
          settings.sessionsBeforeLongBreak > 0 &&
          sessionCount % settings.sessionsBeforeLongBreak === 0
        return (isLong ? settings.longBreakDuration : settings.shortBreakDuration) * 60
      })()
    : 1500

  const progress = totalDuration ? Math.max(timer / totalDuration, 0) : 0
  const radius = 18
  const circumference = 2 * Math.PI * radius

  const handleToggle = (e) => {
    e.preventDefault()
    if (isActive) {
      setIsActive(false)
      persistPause(timer)
    } else {
      if (timer <= 0 || isGoalReached) return
      const now = Date.now()
      if (window.__pomodoroEngine) {
        window.__pomodoroEngine.startTimestampRef.current = now
        window.__pomodoroEngine.durationAtStartRef.current = timer
      }
      localStorage.setItem("pomodoro_is_active", "true")
      localStorage.setItem("pomodoro_start_timestamp", now)
      localStorage.setItem("pomodoro_duration_at_start", timer)
      localStorage.removeItem("pomodoro_paused_time")
      setIsActive(true)
    }
  }

  if (!settings || (timer === 0 && !isActive && !isGoalReached)) return null

  return (
    <div className="mt-4 rounded-2xl border border-accent bg-base-200 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pomodoro</span>
        <Link to="/pomodoro" className="text-xs text-primary hover:underline">
          Open
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {/* Mini circular progress */}
        <div className="relative h-12 w-12 flex-shrink-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 48 48">
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="none"
              strokeWidth="4"
              className="stroke-slate-700"
            />
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              className={`transition-all duration-500 ${isBreak ? "stroke-teal-400" : "stroke-primary"}`}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: circumference * (1 - progress),
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-[10px] font-bold">
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
            {settings?.sessionGoalCount ? ` / ${settings.sessionGoalCount}` : ""}
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
