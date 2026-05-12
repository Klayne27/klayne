import { forwardRef, useEffect, useRef, useState } from "react"
import { useTodoStore } from "../../../store/useTodoStore.js"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { getPriorityColor, getTextColor } from "../../../utils/todoUtils.jsx"
import { IoClose } from "react-icons/io5"
import { FaFlag } from "react-icons/fa6"
import { FaCalendar } from "react-icons/fa"
import { showAppToast } from "../../../utils/showAppToast.js"
import { useCreateTodo } from "../todoHooks/useTodoMutations.js"
import { shouldTextBeWhite } from "../../../utils/shouldTextBeWhite.js"
import { useTheme } from "../../../context/ThemeContext.jsx"
import {
  useDateRecognition,
  formatSuggestedDate,
} from "../../../hooks/customHooks/useDateRecognition.js"
import DateSuggestionChip from "./DateSuggestionChip.jsx"

const CustomDatePickerInput = forwardRef(({ value, onClick }, ref) => (
  <button
    type="button"
    className="flex items-center gap-2 rounded-lg border border-slate-400 px-2 py-1 text-sm text-slate-400 transition-colors hover:opacity-90"
    onClick={onClick}
    ref={ref}
  >
    <FaCalendar />
    <span>Due date</span>
  </button>
))

const TodoAddModal = () => {
  const {
    showCreateTodoModal,
    setShowCreateTodoModal,
    currentListIdForTodoCreation,
    setCurrentListIdForTodoCreation,
  } = useTodoStore()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [priority, setPriority] = useState("low")
  const [dueDate, setDueDate] = useState(null)
  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false)
  const [removeDateFromTitle, setRemoveDateFromTitle] = useState(() => {
    const saved = localStorage.getItem("todo_clear_title_pref")
    return saved !== null ? JSON.parse(saved) : true
  })
  const titleInputRef = useRef(null)
  const { createTodo } = useCreateTodo()
  const { theme } = useTheme()

  // ── Smart date recognition ──────────────────────────────────────────────
  const { result: dateResult, dismiss: dismissDate, reset: resetDate } = useDateRecognition(title)

const handleAcceptDate = () => {
  if (!dateResult) return

  setDueDate(dateResult.date)

  if (removeDateFromTitle) {
    setTitle((prev) => {
      const before = prev.slice(0, dateResult.matchedIndex)
      const after = prev.slice(dateResult.matchedIndex + dateResult.matchedText.length)
      const cleanedTitle = (before + after).replace(/\s{2,}/g, " ").trim()

      // FIX: If cleaning the title makes it empty, keep the original text
      // so the user doesn't end up with a "blank" todo.
      return cleanedTitle === "" ? prev : cleanedTitle
    })
  }

  dismissDate()
  // Use a small timeout to ensure focus stays on the input after state updates
  setTimeout(() => titleInputRef.current?.focus(), 0)
}

const handleTitleKeyDown = (e) => {
  if (e.key === "Enter") {
    // If there's a suggestion, the first Enter picks it.
    if (dateResult) {
      e.preventDefault()
      handleAcceptDate()
    }
    // If no suggestion is visible, the browser will naturally
    // trigger the form's onSubmit (handleSubmit).
  }
}

const handleSubmit = (e) => {
  e.preventDefault()
  if (!title.trim()) {
    showAppToast("Title can't be empty")
    return
  }

  createTodo({
    title: title.trim(),
    description,
    isPublic,
    todoListId: currentListIdForTodoCreation,
    priority,
    dueDate,
  })

  resetForm()
}

  const handleToggleChange = (e) => {
    const newValue = e.target.checked
    setRemoveDateFromTitle(newValue)
    localStorage.setItem("todo_clear_title_pref", JSON.stringify(newValue))
  }

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setIsPublic(false)
    setPriority("low")
    setDueDate(null)
    resetDate() // clear dismissed-text memory too
  }


  const handleClearDate = (e) => {
    e.stopPropagation()
    setDueDate(null)
  }

  const handlePrioritySelect = (p) => {
    setPriority(p)
    setIsPriorityMenuOpen(false)
  }

  useEffect(() => {
    titleInputRef.current?.focus()
  }, [])

  const dueDateObj = dueDate ? new Date(dueDate) : null

  // Logic to determine if time should be displayed
  const shouldShowTime =
    dueDateObj && (dueDateObj.getHours() !== 0 || dueDateObj.getMinutes() !== 0)

  if (!showCreateTodoModal) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-700/70"
      onClick={() => {
        setShowCreateTodoModal(false)
        setCurrentListIdForTodoCreation(null)
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative mx-2 w-full max-w-md rounded-2xl bg-base-100 p-6"
      >
        <h3 className="mb-2 text-xl font-bold">Add Todo</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Title</label>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              placeholder="e.g., Study Math by tomorrow"
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              className="w-full border-b border-gray-300 bg-transparent py-2 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
            />

            {/* ── Date suggestion chip ── */}
            <DateSuggestionChip
              result={dateResult}
              onAccept={handleAcceptDate}
              onDismiss={dismissDate}
              onChange={handleToggleChange}
              checked={removeDateFromTitle}
            />

            <label className="mt-3 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Description
            </label>
            <input
              type="text"
              value={description}
              placeholder="e.g., Finish Chapter 1"
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border-b border-gray-300 bg-transparent py-2 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
            />

            {/* Confirmed due date display */}
            {dueDate && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold">Due:</span>
                <span>
                  {new Date(dueDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {/* ADD THIS: Only show time if it's not midnight (or use your hasTime state) */}
                  {shouldShowTime && (
                    <span className="ml-1 font-medium text-primary">
                      at{" "}
                      {dueDateObj.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleClearDate}
                  className="text-gray-400 hover:text-red-500"
                >
                  <IoClose size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Priority + date picker row */}
          <div className="relative mt-2 flex gap-2">
            <button
              type="button"
              className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-sm hover:opacity-90 ${getPriorityColor(priority)}`}
              onClick={(e) => {
                e.stopPropagation()
                setIsPriorityMenuOpen(!isPriorityMenuOpen)
              }}
            >
              <FaFlag className={getTextColor(priority)} />
              <span className={`${getTextColor(priority)} text-sm`}>Priority</span>
            </button>

            <DatePicker
              selected={dueDate}
              onChange={(date) => setDueDate(date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={5} // Steps of 15 minutes
              timeCaption="time"
              dateFormat="MMM d, yyyy h:mm aa" // Shows time in the input too
              customInput={<CustomDatePickerInput />}
            />

            {isPriorityMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10 h-screen cursor-default bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsPriorityMenuOpen(false)
                  }}
                />
                <ul className="white-shadow absolute -top-40 z-10 mt-1 w-full rounded-2xl bg-base-100 p-2">
                  {["urgent", "high", "medium", "low"].map((p) => (
                    <li key={p}>
                      <button
                        type="button"
                        onClick={() => handlePrioritySelect(p)}
                        className="flex w-full items-center gap-2 rounded-md p-2 text-sm capitalize transition-colors hover:bg-secondary"
                      >
                        <FaFlag className={getTextColor(p)} />
                        {p}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              onClick={(e) => {
                e.stopPropagation()
                setShowCreateTodoModal(false)
                setCurrentListIdForTodoCreation(null)
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex-1 rounded-lg bg-primary px-4 py-2 ${shouldTextBeWhite(theme)} transition-colors hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TodoAddModal
