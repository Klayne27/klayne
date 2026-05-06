import { useState, useEffect, useRef, forwardRef } from "react"
import { getPriorityColor, getTextColor } from "../../../utils/todoUtils.jsx"
import { IoClose } from "react-icons/io5"
import DatePicker from "react-datepicker"
import { FaCalendar, FaFlag } from "react-icons/fa6"
import { showAppToast } from "../../../utils/showAppToast.js"
import { shouldTextBeWhite } from "../../../utils/shouldTextBeWhite.js"
import { useTheme } from "../../../context/ThemeContext.jsx"
import { useDateRecognition } from "../../../hooks/customHooks/useDateRecognition.js"
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

const TodoEditModal = ({ isOpen, onClose, todo, onSave, isLoading }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: null,
    priority: "medium",
  })

  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false)
  const titleInputRef = useRef(null)
  const lastFocusedElementRef = useRef(null)
  const { theme } = useTheme()

  const [removeDateFromTitle, setRemoveDateFromTitle] = useState(() => {
    const saved = localStorage.getItem("todo_clear_title_pref")
    return saved !== null ? JSON.parse(saved) : true
  })

  const {
    result: dateResult,
    dismiss: dismissDate,
    reset: resetDate,
  } = useDateRecognition(formData.title)

  const handleAcceptDate = () => {
    if (!dateResult) return

    setFormData((prev) => {
      const before = prev.title.slice(0, dateResult.matchedIndex)
      const after = prev.title.slice(dateResult.matchedIndex + dateResult.matchedText.length)
      const cleanedTitle = (before + after).replace(/\s{2,}/g, " ").trim()

      return {
        ...prev,
        // FIX: Don't let the title become empty if the user only typed a date
        title: cleanedTitle === "" ? prev.title : cleanedTitle,
        dueDate: dateResult.date,
      }
    })

    dismissDate()
    // Small timeout ensures the focus stickiness
    setTimeout(() => titleInputRef.current?.focus(), 0)
  }

  const handleTitleKeyDown = (e) => {
    if (e.key === "Enter") {
      // If there's a suggestion, the first Enter picks it.
      if (dateResult) {
        e.preventDefault()
        handleAcceptDate()
      }
      // If no suggestion, form naturally triggers handleSubmit
    }
  }

  // Populate form when todo changes
  useEffect(() => {
    if (todo) {
      setFormData({
        title: todo.title || "",
        description: todo.description || "",
        dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
        priority: todo.priority || "medium",
      })
      resetDate()
    }
  }, [todo, resetDate])

  useEffect(() => {
    if (isOpen) {
      titleInputRef.current?.focus()
      lastFocusedElementRef.current = titleInputRef.current
    }
  }, [isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      showAppToast("Title can't be empty")
      return
    }

    onSave({
      id: todo._id,
      todoData: {
        title: formData.title.trim(),
        description: formData.description,
        dueDate: formData.dueDate,
        priority: formData.priority,
      },
    })

    showAppToast("Task successfully updated", "success")
    onClose()
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleDateChange = (date) => {
    setFormData((prev) => ({ ...prev, dueDate: date }))
  }

  const handleClearDate = (e) => {
    e.stopPropagation()
    setFormData((prev) => ({ ...prev, dueDate: null }))
  }

  const handleToggleChange = (e) => {
    const newValue = e.target.checked
    setRemoveDateFromTitle(newValue)
    localStorage.setItem("todo_clear_title_pref", JSON.stringify(newValue))
  }

  const handlePrioritySelect = (priority) => {
    setFormData((prev) => ({ ...prev, priority }))
    setIsPriorityMenuOpen(false)
    lastFocusedElementRef.current?.focus()
  }

  // ── Time Display Logic ──────────────────────────────────────────────
  const dueDateObj = formData.dueDate ? new Date(formData.dueDate) : null
  const shouldShowTime =
    dueDateObj && (dueDateObj.getHours() !== 0 || dueDateObj.getMinutes() !== 0)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-700/70"
      onClick={onClose}
    >
      <div
        className="mx-2 w-full max-w-md rounded-3xl bg-base-100 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-semibold">Edit Todo</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500">Title</label>
            <input
              ref={titleInputRef}
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              onKeyDown={handleTitleKeyDown} // ADDED THIS
              onFocus={() => (lastFocusedElementRef.current = titleInputRef.current)}
              className="w-full border-b border-gray-300 bg-transparent py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-white"
            />

            <DateSuggestionChip
              result={dateResult}
              onAccept={handleAcceptDate}
              onDismiss={dismissDate}
              onChange={handleToggleChange}
              checked={removeDateFromTitle}
            />

            <label className="mt-3 block text-xs font-medium text-gray-500">Description</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full border-b border-gray-300 bg-transparent py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-white"
            />

            {/* FIXED: Confirmed due date display with Time */}
            {formData.dueDate && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <span className="font-semibold">Due:</span>
                <span>
                  {dueDateObj.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {shouldShowTime && (
                    <span className="ml-1 font-bold text-primary">
                      at{" "}
                      {dueDateObj.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </span>
                <button
                  type="button" // MUST be type="button"
                  onClick={handleClearDate}
                  className="ml-auto text-gray-400 hover:text-red-500"
                >
                  <IoClose size={18} />
                </button>
              </div>
            )}
          </div>

          <div className="relative mt-2 flex gap-2">
            {/* ... Priority Button logic ... */}
            <button
              type="button"
              className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-sm hover:opacity-90 ${getPriorityColor(formData.priority)}`}
              onClick={(e) => {
                e.stopPropagation()
                setIsPriorityMenuOpen(!isPriorityMenuOpen)
              }}
            >
              <FaFlag className={getTextColor(formData.priority)} />
              <span className={`${getTextColor(formData.priority)} text-sm`}>Priority</span>
            </button>

            {/* FIXED: DatePicker with Time support */}
            <DatePicker
              selected={formData.dueDate}
              onChange={handleDateChange}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="MMM d, yyyy h:mm aa"
              customInput={<CustomDatePickerInput />}
              onCalendarClose={() => lastFocusedElementRef.current?.focus()}
            />

            {/* ... Priority Menu List ... */}
          </div>

          <div className="flex gap-2 pt-4">
            {/* ... Cancel and Save buttons ... */}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`flex-1 rounded-lg bg-primary ${shouldTextBeWhite(theme)} px-4 py-2 transition-colors hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TodoEditModal
