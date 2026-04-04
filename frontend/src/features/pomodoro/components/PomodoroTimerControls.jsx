import { FaCog, FaPlay, FaPause, FaRedo } from "react-icons/fa"

function PomodoroTimerControls({
  onOpenSettingsPage,
  isGoalReached,
  isActive,
  onPause,
  onStart,
  timer,
  onResetTimerClick,
}) {
  return (
    <div className="flex w-full items-center justify-center gap-8">
      <button
        onClick={onOpenSettingsPage}
        className="p-2 text-slate-500 transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Open settings"
        disabled={isActive || isGoalReached}
      >
        <FaCog size={30} />
      </button>

      <button
        onClick={isActive ? onPause : onStart}
        className={`text-6xl transition-colors duration-300 hover:text-primary active:scale-95 disabled:opacity-50 ${isActive ? "text-teal-500" : "text-primary"}`}
        aria-label={isActive ? "Pause timer" : "Start timer"}
        disabled={timer <= 0 || isGoalReached}
      >
        {isActive ? <FaPause size={50} /> : <FaPlay size={50} />}
      </button>

      <button
        onClick={onResetTimerClick}
        className="p-2 text-slate-500 transition-colors hover:text-primary"
        aria-label="Reset timer"
      >
        <FaRedo size={28} />
      </button>
    </div>
  )
}

export default PomodoroTimerControls
