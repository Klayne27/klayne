import { FaCog, FaPlay, FaPause } from "react-icons/fa"
import { RxReset } from "react-icons/rx"

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
    <div className="flex items-center justify-center gap-8">
      <button
        onClick={onOpenSettingsPage}
        className="group flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.03] text-slate-500 backdrop-blur-md transition-all hover:bg-white/[0.08] hover:text-slate-200"
      >
        <FaCog size={18} className="transition-transform duration-500 group-hover:rotate-45" />
      </button>

      <button
        onClick={isActive ? onPause : onStart}
        disabled={timer <= 0 || isGoalReached}
        className={`relative flex h-20 w-20 items-center justify-center rounded-[2.5rem] shadow-2xl transition-all duration-500 active:scale-90 ${
          isActive
            ? "bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/30 hover:bg-teal-500/20"
            : "bg-primary/10 text-primary ring-1 ring-primary/30 hover:bg-primary/20"
        }`}
      >
        {isActive && (
          <span className="absolute inset-0 animate-ping rounded-[2.5rem] bg-teal-500/10 opacity-40" />
        )}
        {isActive ? <FaPause size={28} /> : <FaPlay size={28} className="ml-1.5" />}
      </button>

      <button
        onClick={onResetTimerClick}
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.03] text-slate-500 backdrop-blur-md transition-all hover:bg-white/[0.08] hover:text-slate-200"
      >
        <RxReset size={20} />
      </button>
    </div>
  )
}

export default PomodoroTimerControls
