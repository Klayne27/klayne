// src/components/todos/TodoEditForm.jsx
import { useState, useEffect, useRef } from "react"
import { FaTrash, FaCheck, FaFlag, FaCaretDown, FaCalendar } from "react-icons/fa6"
import { getTextColor } from "../../utils/todoUtils"
import { RxCaretDown } from "react-icons/rx"

const TodoEditForm = ({ todo, onClose, onSave, onDelete, isLoading }) => {
  const [formData, setFormData] = useState({
    title: "",
    dueDate: "",
    priority: "medium",
  })

  // State for the priority dropdown menu
  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false)
  const priorityMenuRef = useRef(null)
  const dateInputRef = useRef(null)

  // Create a ref to store the initial state for comparison
  const initialData = useRef(null)

  // Format date for display on the button
  const formattedDisplayDate = formData.dueDate
    ? new Date(formData.dueDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC", // Use UTC to avoid timezone off-by-one errors
      })
    : "No due date"

  useEffect(() => {
    if (todo) {
      const formattedDueDate = todo.dueDate
        ? new Date(todo.dueDate).toISOString().split("T")[0]
        : ""
      const newFormData = {
        title: todo.title || "",
        dueDate: formattedDueDate,
        priority: todo.priority || "medium",
      }
      setFormData(newFormData)
      // Store the initial data for comparison
      initialData.current = newFormData
    }
  }, [todo])

  // Close priority menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (priorityMenuRef.current && !priorityMenuRef.current.contains(event.target)) {
        setIsPriorityMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [priorityMenuRef])

  const handleSubmit = (e) => {
    e.preventDefault()

    // Create a new object with the data to be sent, including the ID
    const updateData = {
      id: todo._id,
      todoData: {
        title: formData.title,
        dueDate: formData.dueDate || null,
        priority: formData.priority,
      },
    }

    // Check if any of the form data has changed from the initial data
    const hasChanges =
      formData.title !== initialData.current.title ||
      formData.dueDate !== initialData.current.dueDate ||
      formData.priority !== initialData.current.priority

    if (hasChanges) {
      // If there are changes, call the onSave function
      onSave(updateData)
    } else {
      // If no changes, just close the modal without a toast
      onClose()
    }
  }

  const handlePrioritySelect = (priority) => {
    setFormData((prev) => ({ ...prev, priority }))
    setIsPriorityMenuOpen(false)
  }

  const handleDateChange = (e) => {
    setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
  }

  const handleInputChange = (field) => (e) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }))
  }

  // Prevents form submission on Enter key press for a better UX in single-line inputs
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.target.type !== "textarea") {
      e.preventDefault()
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500"
      case "high":
        return "bg-orange-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
      default:
        return "bg-slate-400"
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className="flex h-full w-full flex-col p-1"
    >
      {/* Header with Actions */}
      <div className="flex items-center justify-between pb-6">
        <button
          type="button"
          onClick={onDelete}
          className="rounded-full p-2 text-gray-500 transition-colors hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/50"
          disabled={isLoading}
          aria-label="Delete Todo"
        >
          <FaTrash size={16} />
        </button>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Edit Task</h2>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-full p-2 text-gray-500 transition-colors hover:bg-blue-100 hover:text-blue-600 disabled:cursor-not-allowed dark:hover:bg-blue-900/50"
          aria-label="Save Changes"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          ) : (
            <FaCheck size={18} />
          )}
        </button>
      </div>

      <div className="flex-grow space-y-8">
        {/* Title Field */}
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={handleInputChange("title")}
            className="w-full border-b border-gray-300 bg-transparent py-2 text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-white"
            required
          />
        </div>

        {/* Due Date Field */}
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Due Date</label>
          <button
            type="button"
            onClick={() => dateInputRef.current.showPicker()}
            className="flex w-full items-center gap-2 border-b border-gray-300 bg-transparent py-2 text-left text-gray-900 transition-colors hover:border-blue-500 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-white"
          >
            <FaCalendar className="text-gray-400" />
            <span className={!formData.dueDate ? "text-gray-400" : ""}>{formattedDisplayDate}</span>
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={formData.dueDate}
            onChange={handleDateChange}
            className="hidden"
          />
        </div>

        {/* Priority Field with Dropdown Menu */}
        <div className="relative">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Priority</label>
          <button
            type="button"
            onClick={() => setIsPriorityMenuOpen(!isPriorityMenuOpen)}
            className="flex w-full items-center justify-between border-b border-gray-300 bg-transparent py-2 text-gray-900 transition-colors focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-white"
          >
            <div className="flex items-center gap-2 capitalize">
              <FaFlag className={getTextColor(formData.priority)} />

              <span>{formData.priority}</span>
            </div>
            {/* You can add a chevron icon here for a visual indicator */}
            <RxCaretDown />
          </button>

          {isPriorityMenuOpen && (
            <ul
              ref={priorityMenuRef}
              className="white-shadow absolute -top-40 z-10 mt-1 w-full rounded-2xl bg-base-100 p-1"
            >
              {["urgent", "high", "medium", "low"].map((priority) => (
                <li key={priority}>
                  <button
                    type="button"
                    onClick={() => handlePrioritySelect(priority)}
                    className="flex w-full items-center gap-2 rounded-md p-2 text-sm capitalize text-gray-800 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-gray-600"
                  >
                    <FaFlag className={getTextColor(priority)} />
                    {priority}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </form>
  )
}

export default TodoEditForm
