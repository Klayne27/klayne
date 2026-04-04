import { useState, useEffect, useRef, forwardRef } from "react"
import { getPriorityColor, getTextColor } from "../../../utils/todoUtils.jsx"
import { IoClose } from "react-icons/io5"
import DatePicker from "react-datepicker"
import { FaCalendar, FaFlag } from "react-icons/fa6"
import { showAppToast } from "../../../utils/showAppToast.js"

const CustomDatePickerInput = forwardRef(({ value, onClick }, ref) => (
  <button
    type="button"
    className="flex items-center gap-2 rounded-lg border border-slate-400 px-2 py-1 text-sm text-slate-400 transition-colors hover:opacity-90"
    onClick={onClick}
    ref={ref}
  >
    <FaCalendar />
    <span>{"Due date"}</span>
  </button>
))

const TodoEditModal = ({ isOpen, onClose, todo, onSave, isLoading }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium",
  })

  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false)
  const titleInputRef = useRef(null)
  const lastFocusedElementRef = useRef(null)

  useEffect(() => {
    if (todo) {
      setFormData({
        title: todo.title || "",
        description: todo.description || "",
        dueDate: todo.dueDate ? new Date(todo.dueDate).toISOString().split("T")[0] : "",
        priority: todo.priority || "medium",
      })
    }
  }, [todo])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.title) {
      showAppToast("Title can't be empty")
      return
    }

    const updateData = {
      id: todo._id,
      todoData: {
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate,
        priority: formData.priority,
      },
    }

    onSave(updateData)

    setFormData({
      title: "",
      description: "",
      dueDate: null,
      priority: "low",
    })
    onClose()
  }

  const handleCloseMenu = (e) => {
    e.stopPropagation()

    setIsPriorityMenuOpen(false)
    lastFocusedElementRef.current?.focus()
  }

  const handlePrioritySelect = (priority) => {
    setFormData((prev) => ({ ...prev, priority }))
    setIsPriorityMenuOpen(false)
    lastFocusedElementRef.current?.focus()
  }

  // Handle DatePicker change, it receives a Date object
  const handleDateChange = (date) => {
    setFormData((prev) => ({ ...prev, dueDate: date }))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target

    setFormData((data) => ({
      ...data,
      [name]: value,
    }))
  }

  const handleClearDate = (e) => {
    e.stopPropagation()
    setFormData((data) => ({ ...data, dueDate: null }))
  }

  useEffect(() => {
    titleInputRef.current.focus()
    lastFocusedElementRef.current = titleInputRef.current
  }, [])

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
        <div className="flex items-center justify-between border-slate-600">
          <h2 className="mb-2 text-xl font-semibold">Edit Todo</h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          ></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Title</label>
            <input
              ref={titleInputRef}
              onFocus={() => (lastFocusedElementRef.current = titleInputRef.current)}
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full border-b border-gray-300 bg-transparent py-2 text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-white"
            />
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Description
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full border-b border-gray-300 bg-transparent py-2 text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-white"
            />
            {formData.dueDate && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold">Due:</span>
                <span>
                  {new Date(formData.dueDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <button
                  type="button"
                  onClick={handleClearDate}
                  className="text-gray-400 hover:text-red-500"
                  aria-label="Clear due date"
                >
                  <IoClose size={16} />
                </button>
              </div>
            )}
          </div>
          <div className="relative mt-2 flex gap-2">
            <button
              type="button"
              className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-sm hover:opacity-90 ${getPriorityColor(formData.priority)}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation()
                setIsPriorityMenuOpen(!isPriorityMenuOpen)
              }}
            >
              <FaFlag className={getTextColor(formData.priority)} />{" "}
              <span className={`${getTextColor(formData.priority)} text-sm`}>Priority</span>
            </button>
            <div>
              <DatePicker
                selected={formData.dueDate}
                onChange={handleDateChange}
                dateFormat="MMM d, yyyy"
                customInput={<CustomDatePickerInput />}
                onCalendarClose={() => {
                  if (lastFocusedElementRef.current) {
                    lastFocusedElementRef.current.focus()
                  }
                }}
              />
            </div>
            {isPriorityMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10 h-screen cursor-default bg-transparent"
                  // onClick={handleCloseMenu}
                ></div>
                <ul
                  // ref={priorityMenuRef}
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

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
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
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-white transition-colors hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-50"
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
