import { FaCog, FaPlay, FaPause } from "react-icons/fa"
import { RxReset } from "react-icons/rx"
import { Tooltip } from "react-tooltip"
import { useSound } from "../../../hooks/customHooks/useSound"

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
      {/* Settings Button */}
      <button
        onClick={onOpenSettingsPage}
        data-tooltip-id="timer-tooltip"
        data-tooltip-content="Settings"
        className="group flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.03] text-slate-500 backdrop-blur-sm transition-all hover:bg-white/[0.08] hover:text-slate-200"
      >
        <FaCog size={24} className="transition-transform duration-500 group-hover:rotate-45" />
      </button>

      {/* Start/Pause Button */}
      <button
        onClick={isActive ? onPause : onStart}
        disabled={timer <= 0 || isGoalReached}
        data-tooltip-id="timer-tooltip"
        data-tooltip-content={isActive ? "Pause" : "Start"}
        className={`relative flex h-20 w-20 items-center justify-center shadow-2xl backdrop-blur-sm active:scale-90 ${
          isActive
            ? "rounded-3xl bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/30 hover:bg-teal-500/20"
            : "rounded-full bg-primary/10 text-primary ring-1 ring-primary/30 hover:bg-primary/20"
        }`}
      >
        {isActive && (
          <span className="absolute inset-0 animate-ping rounded-[2.5rem] bg-teal-500/10 opacity-40" />
        )}
        {isActive ? <FaPause size={28} /> : <FaPlay size={28} className="ml-1.5" />}
      </button>

      {/* Reset Button */}
      <button
        onClick={onResetTimerClick}
        data-tooltip-id="timer-tooltip"
        data-tooltip-content="Reset Timer"
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.03] text-slate-500 backdrop-blur-sm transition-all hover:bg-white/[0.08] hover:text-slate-200"
      >
        <RxReset size={26} />
      </button>

      <Tooltip
        id="timer-tooltip"
        place="top"
        variant="dark"
        className="!rounded-lg !px-2.5 !py-1.5 !text-xs font-medium shadow-xl"
      />
    </div>
  )
}

export default PomodoroTimerControls
