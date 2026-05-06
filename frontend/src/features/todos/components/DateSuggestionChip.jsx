import { FaCalendar } from "react-icons/fa"
import { IoClose } from "react-icons/io5"
import { formatSuggestedDate } from "../../../hooks/customHooks/useDateRecognition"

const DateSuggestionChip = ({ result, onAccept, onDismiss, onChange, checked }) => {
  if (!result) return null

  const label = formatSuggestedDate(result.date, result.hasTime)

  return (
    <>
      <div className="mt-2 flex animate-fade-in items-center gap-1.5">
        {/* Clicking the main chip area = accept */}
        <button
          type="button"
          onClick={onAccept}
          className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/20 active:scale-95"
        >
          <FaCalendar size={10} className="shrink-0" />
          <span>Due {label}</span>
          {/* Matched text preview — helps user understand what was parsed */}
          <span className="ml-1 rounded-sm bg-primary/15 px-1 font-normal italic text-primary/70">
            "{result.matchedText}"
          </span>
        </button>

        {/* Dismiss — stops propagation so it doesn't also trigger onAccept */}
        <button
          type="button"
          aria-label="Dismiss date suggestion"
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          className="rounded-full p-1 text-slate-400 transition hover:bg-secondary hover:text-base-content"
        >
          <IoClose size={14} />
        </button>
      </div>
      {result && (
        <div className="mt-1 flex items-center gap-2 px-1">
          <input
            type="checkbox"
            id="removeDateToggle"
            checked={checked}
            onChange={onChange}
            className="checkbox-primary checkbox checkbox-xs"
          />
          <label
            htmlFor="removeDateToggle"
            className="cursor-pointer text-[10px] font-bold uppercase text-gray-400"
          >
            Clear date from title
          </label>
        </div>
      )}
    </>
  )
}

export default DateSuggestionChip
