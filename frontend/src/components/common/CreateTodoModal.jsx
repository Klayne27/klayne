// components/modals/CreateTodoModal.jsx
import React, { forwardRef, useEffect, useRef, useState } from "react"
import { useTodoStore } from "../../store/useTodoStore"
import { useCreateTodo } from "../../hooks/todoHooks/useTodoQueries"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { getPriorityColor, getTextColor } from "../../utils/todoUtils.jsx"
import { IoClose } from "react-icons/io5"
import { FaFlag } from "react-icons/fa6"
import { FaCalendar } from "react-icons/fa"
import { showAppToast } from "../../utils/showAppToast"

const CustomDatePickerInput = forwardRef(({ value, onClick }, ref) => (
  <button
    type="button"
    className="flex items-center gap-2 rounded-lg border border-slate-400 px-2 py-1 text-sm text-slate-400 transition-colors hover:bg-gray-700/70"
    onClick={onClick}
    ref={ref}
  >
    <FaCalendar />
    <span>{"Due date"}</span>
  </button>
))

const CreateTodoModal = () => {
  const {
    showCreateTodoModal,
    setShowCreateTodoModal,
    currentListIdForTodoCreation,
    setCurrentListIdForTodoCreation,
  } = useTodoStore()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [priority, setPriority] = useState("low") // New state for priority
  const [dueDate, setDueDate] = useState(null) // New state for due date

  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false)
  const titleInputRef = useRef(null)

  const { createTodo, isCreatingTodo } = useCreateTodo()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title) {
      showAppToast("Title can't be empty")
      return
    }
    createTodo({
      title,
      description,
      isPublic,
      todoListId: currentListIdForTodoCreation,
      priority, // Include priority
      dueDate, // Include dueDate
    })

    setTitle("")
    setDescription("")
    setIsPublic(false)
    setPriority("low") // Reset priority
    setDueDate(null) // Reset due date
    // setShowCreateTodoModal(false)
    // setCurrentListIdForTodoCreation(null)
    titleInputRef.current.focus()
  }

  const handleClearDate = (e) => {
    e.stopPropagation()
    setDueDate(null)
  }

  const handlePrioritySelect = (priority) => {
    setPriority(priority)
    setIsPriorityMenuOpen(false)
  }

  useEffect(() => {
    titleInputRef.current.focus()
  }, [])

  if (!showCreateTodoModal) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-700/70"
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
              placeholder="e.g., Study Math"
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-b border-gray-300 bg-transparent py-2 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
            />
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Description
            </label>
            <input
              type="text"
              value={description}
              placeholder="e.g., Finish Chapter 1"
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border-b border-gray-300 bg-transparent py-2 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
            />
            {dueDate && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold">Due:</span>
                <span>
                  {new Date(dueDate).toLocaleDateString("en-US", {
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
              className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-sm hover:bg-gray-700/70 ${getPriorityColor(priority)}`}
              onClick={(e) => {
                e.stopPropagation()
                setIsPriorityMenuOpen(!isPriorityMenuOpen)
              }}
            >
              <FaFlag className={getTextColor(priority)} />{" "}
              <span className={`${getTextColor(priority)} text-sm`}>Priority</span>
            </button>
            <div>
              <DatePicker
                selected={dueDate}
                onChange={(date) => setDueDate(date)}
                dateFormat="MMM d, yyyy"
                customInput={<CustomDatePickerInput />}
              />
            </div>
            {isPriorityMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10 h-screen cursor-default bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsPriorityMenuOpen(false)
                  }}
                ></div>
                <ul
                  // ref={priorityMenuRef}
                  className="white-shadow absolute -top-40 z-10 mt-1 w-full rounded-2xl bg-base-100 p-2"
                >
                  {["urgent", "high", "medium", "low"].map((priority) => (
                    <li key={priority}>
                      <button
                        type="button"
                        onClick={() => handlePrioritySelect(priority)}
                        className="flex w-full items-center gap-2 rounded-md p-2 text-sm capitalize transition-colors hover:bg-secondary"
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
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-white transition-colors hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isCreatingTodo}
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateTodoModal
