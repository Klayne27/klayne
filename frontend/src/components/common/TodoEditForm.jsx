// src/components/todos/TodoEditForm.jsx
import { useState, useEffect, useRef, forwardRef } from "react"
import { FaTrash, FaCheck, FaFlag, FaCalendar } from "react-icons/fa6"
import { getTextColor } from "../../utils/todoUtils"
import { RxCaretDown, RxCaretUp } from "react-icons/rx"

// Import React Datepicker
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { IoClose } from "react-icons/io5"

// Custom input component for DatePicker
const CustomDateInput = forwardRef(({ value, onClick, placeholder, onClear }, ref) => (
  <button
    type="button"
    onClick={onClick}
    ref={ref}
    className="flex w-full items-center gap-2 border-b border-gray-300 bg-transparent py-2 text-left text-gray-900 transition-colors hover:border-blue-500 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-white"
  >
    <FaCalendar className="text-gray-400" />
    <span className={!value ? "text-gray-400" : ""}>{value || placeholder}</span>
    {value && (
      <div
        onClick={onClear}
        className="ml-auto text-gray-400 hover:text-red-500 focus:outline-none"
      >
        <IoClose />
      </div>
    )}
  </button>
))

const TodoEditForm = ({ todo, onClose, onSave, onDelete, isLoading }) => {
  const [formData, setFormData] = useState({
    title: "",
    dueDate: null, // Change initial state to null for Date object
    priority: "medium",
  })

  // State for the priority dropdown menu
  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false)
  const priorityMenuRef = useRef(null)

  // Create a ref to store the initial state for comparison
  const initialData = useRef(null)

  useEffect(() => {
    if (todo) {
      // Create a Date object from the due date string
      const formattedDueDate = todo.dueDate ? new Date(todo.dueDate) : null
      const newFormData = {
        title: todo.title || "",
        dueDate: formattedDueDate,
        priority: todo.priority || "medium",
      }
      setFormData(newFormData)
      // Store the initial data for comparison
      initialData.current = {
        ...newFormData,
        dueDate: formattedDueDate ? formattedDueDate.toISOString().split("T")[0] : "",
      }
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

    const updateData = {
      id: todo._id,
      todoData: {
        title: formData.title,
        dueDate: formData.dueDate ? formData.dueDate.toISOString() : null,
        priority: formData.priority,
      },
    }

    onSave(updateData)
  }

  const handlePrioritySelect = (priority) => {
    setFormData((prev) => ({ ...prev, priority }))
    setIsPriorityMenuOpen(false)
  }

  // Handle DatePicker change, it receives a Date object
  const handleDateChange = (date) => {
    setFormData((prev) => ({ ...prev, dueDate: date }))
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

  const handleClearDate = (e) => {
    e.stopPropagation()
    setFormData((data) => ({ ...data, dueDate: null }))
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

        {/* Due Date Field with React Datepicker */}
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Due Date</label>
          <DatePicker
            selected={formData.dueDate}
            onChange={handleDateChange}
            dateFormat="MMM d, yyyy"
            showPopperArrow={true}
            placeholderText="No due date"
            customInput={<CustomDateInput onClear={handleClearDate} />}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-primary focus:outline-none"
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
            {isPriorityMenuOpen ? <RxCaretUp /> : <RxCaretDown />}
          </button>

          {isPriorityMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10 h-screen cursor-default bg-transparent"
                onClick={onClose}
              ></div>
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
            </>
          )}
        </div>
      </div>
    </form>
  )
}

export default TodoEditForm
