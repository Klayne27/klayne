import { useState } from "react"
import { useDateRecognition } from "../../../hooks/customHooks/useDateRecognition"
import SmartDateChip from "./SmartDateChip"

const CreateTodoInput = ({ onSubmit }) => {
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState(null) // the accepted Date object

  const { result, dismiss, reset } = useDateRecognition(title)

  // ── Accept the suggested date ───────────────────────────────────────────────
  const handleAcceptDate = (date) => {
    setDueDate(date)

    // Strip the matched text from the title (Microsoft Todo behavior).
    // To KEEP it instead, remove the next two lines.
    const stripped = title
      .slice(0, result.matchedIndex)
      .concat(title.slice(result.matchedIndex + result.matchedText.length))
      .replace(/\s{2,}/g, " ")
      .trim()
    setTitle(stripped)

    dismiss()
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return

    onSubmit({ title: title.trim(), dueDate })

    // Reset everything
    setTitle("")
    setDueDate(null)
    reset()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value)
          // If user edited away the accepted date context, clear it
          if (dueDate) setDueDate(null)
        }}
        placeholder='Try "submit report tomorrow at 3pm"'
        className="input input-bordered w-full rounded-xl"
      />

      {/* Smart date chip — only shown when a date is detected */}
      <SmartDateChip result={result} onAccept={handleAcceptDate} onDismiss={dismiss} />

      {/* Show accepted due date as a removable pill */}
      {dueDate && !result && (
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            📅{" "}
            {dueDate.toLocaleDateString([], {
              weekday: "short",
              month: "short",
              day: "numeric",
              ...(dueDate.getHours() !== 0 && { hour: "numeric", minute: "2-digit" }),
            })}
          </span>
          <button
            type="button"
            onClick={() => setDueDate(null)}
            className="text-xs text-slate-500 hover:text-red-400"
          >
            Remove
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={!title.trim()}
        className="self-start rounded-full bg-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        Add
      </button>
    </form>
  )
}

export default CreateTodoInput
