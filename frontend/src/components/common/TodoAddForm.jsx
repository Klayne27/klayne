import { useEffect, useRef, useState } from "react"
import { FaCalendar, FaFlag, FaPlus } from "react-icons/fa6"
import { useCreateTodo } from "../../hooks/todoHooks/useTodoQueries"
import { useTodoStore } from "../../store/useTodoStore"
import { getPriorityColor, getTextColor } from "../../utils/todoUtils"
import { showAppToast } from "../../utils/showAppToast"
import DatePicker from "react-datepicker"
import { forwardRef } from "react"
import { IoClose } from "react-icons/io5"
import useLockBodyScroll from "../../hooks/customHooks/useLockBodyScroll"

// A custom button component for the date picker.
const CustomDatePickerInput = forwardRef(({ value, onClick }, ref) => (
  <button
    type="button"
    className="flex items-center gap-2 rounded-lg border border-slate-400 px-2 py-1 text-sm text-slate-400 transition-colors"
    onClick={onClick}
    ref={ref}
  >
    <FaCalendar />
    <span>{"Due date"}</span>
  </button>
))

function TodoAddForm({ isLoading, setIsMenuOpen, isMenuOpen }) {
  const { currentListIdForTodoCreation, setCurrentListIdForTodoCreation } = useTodoStore()


  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [priority, setPriority] = useState("low")
  const [dueDate, setDueDate] = useState(null)

  const titleInputRef = useRef(null)

  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false)

  const { createTodo } = useCreateTodo()

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
      priority,
      dueDate,
    })

    setTitle("")
    setDescription("")
    setIsPublic(false)
    setPriority("low")
    setDueDate(null)
    setIsMenuOpen(false)
    setCurrentListIdForTodoCreation(null)
  }

  const handlePrioritySelect = (priority) => {
    setPriority(priority)
    setIsPriorityMenuOpen(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.target.type !== "textarea") {
      e.preventDefault()
    }
  }

  const handleClearDate = (e) => {
    e.stopPropagation()
    setDueDate(null)
  }

  useEffect(() => {
    titleInputRef.current.focus()
  }, [])

  return (
    <>
      <form
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        className="flex h-full w-full flex-col p-1"
      >
        {/* Header with Actions */}
        <div className="flex items-center justify-between pb-6">
          <div
            className="rounded-full px-4 text-gray-500 transition-colors hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/50"
            disabled={isLoading}
            aria-label="Delete Todo"
          ></div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Add Todo</h2>
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-blue-100 hover:bg-green-900/50 hover:text-green-600 disabled:cursor-not-allowed"
            aria-label="Save Changes"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            ) : (
              <FaPlus size={18} />
            )}
          </button>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Title</label>
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            placeholder="e.g., Study Math"
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border-b border-gray-300 bg-transparent py-2 text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-white"
          />
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Description</label>
          <input
            type="text"
            value={description}
            placeholder="e.g., Finish Chapter 1"
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border-b border-gray-300 bg-transparent py-2 text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-white"
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
            className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-sm ${getPriorityColor(priority)}`}
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
      </form>
    </>
  )
}

export default TodoAddForm
