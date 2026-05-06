import { FaCalendarAlt, FaCheck, FaTimes } from "react-icons/fa"
import { formatSuggestedDate } from "../../../hooks/customHooks/useDateRecognition"

/**
 * Chip that appears below a todo input when chrono-node detects a date.
 *
 * Props:
 *   result     — object from useDateRecognition: { date, matchedText, hasTime }
 *   onAccept   — called with (date) when user accepts
 *   onDismiss  — called when user dismisses
 */
const SmartDateChip = ({ result, onAccept, onDismiss }) => {
  if (!result) return null

  const label = formatSuggestedDate(result.date, result.hasTime)

  return (
    <div
      className="animate-in fade-in slide-in-from-top-1 flex items-center gap-2 rounded-xl border border-accent bg-base-200 px-3 py-2 duration-150"
      role="status"
      aria-live="polite"
    >
      {/* Calendar icon */}
      <FaCalendarAlt size={12} className="shrink-0 text-primary" />

      {/* Label */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-xs">
        <span className="font-semibold text-primary">{label}</span>
        <span className="truncate text-slate-500">&mdash; &ldquo;{result.matchedText}&rdquo;</span>
      </div>

      {/* Accept */}
      <button
        type="button"
        onClick={() => onAccept(result.date)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary transition hover:bg-primary/30"
        title="Set as due date"
        aria-label="Set as due date"
      >
        <FaCheck size={9} />
      </button>

      {/* Dismiss */}
      <button
        type="button"
        onClick={onDismiss}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-base-300 hover:text-slate-300"
        title="Dismiss"
        aria-label="Dismiss date suggestion"
      >
        <FaTimes size={9} />
      </button>
    </div>
  )
}

export default SmartDateChip
