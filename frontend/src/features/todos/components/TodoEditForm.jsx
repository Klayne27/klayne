import { useState, useEffect, useRef } from "react"
import { FaCheck, FaFlag, FaTrashCan } from "react-icons/fa6"
import { getPriorityColor, getTextColor } from "../../../utils/todoUtils.jsx"

import "react-datepicker/dist/react-datepicker.css"
import { IoClose } from "react-icons/io5"
import CustomDatePicker from "../../../components/common/CustomDatePicker.jsx"
import { showAppToast } from "../../../utils/showAppToast.js"

const TodoEditForm = ({ todo, onSave, onDelete, isLoading }) => {

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("low")
  const [dueDate, setDueDate] = useState(null)

  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const priorityMenuRef = useRef(null)
  const titleInputRef = useRef(null)

  useEffect(() => {
    if (todo) {
      const formattedDueDate = todo.dueDate ? new Date(todo.dueDate) : null
      setTitle(todo.title)
      setDescription(todo.description)
      setPriority(todo.priority)
      setDueDate(formattedDueDate)
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
    if (!title) {
      showAppToast("Title can't be empty")
      return
    }

    const updateData = {
      id: todo._id,
      todoData: {
        title: title,
        description: description,
        dueDate: dueDate ? dueDate.toISOString() : null,
        priority: priority,
      },
    }

    onSave(updateData)
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
          className="rounded-full p-2 text-gray-500 transition-colors hover:bg-red-100"
          disabled={isLoading}
          aria-label="Delete Todo"
        >
          <FaTrashCan size={16} />
        </button>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Edit Todo</h2>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-full p-2 text-gray-500 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed"
          aria-label="Save Changes"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          ) : (
            <FaCheck size={18} />
          )}
        </button>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Title</label>
        <input
          ref={titleInputRef}
          type="text"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border-b border-gray-300 bg-transparent py-2 text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-white"
        />
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Description</label>
        <input
          type="text"
          name="description"
          value={description}
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
              onMouseDown={(e) => e.preventDefault()}
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
          onMouseDown={(e) => e.preventDefault()}
          className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-sm ${getPriorityColor(priority)}`}
          onClick={(e) => {
            e.stopPropagation()
            setIsPriorityMenuOpen(!isPriorityMenuOpen)
          }}
        >
          <FaFlag className={getTextColor(priority)} />{" "}
          <span className={`${getTextColor(priority)} text-sm`}>Priority</span>
        </button>
        <CustomDatePicker
          selectedDate={dueDate}
          onDateChange={setDueDate}
          isOpen={isDatePickerOpen}
          onToggle={setIsDatePickerOpen}
          placeholder="Select due date"
        />
        {isPriorityMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-10 h-screen cursor-default bg-transparent"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation()
                setIsPriorityMenuOpen(false)
              }}
            ></div>
            <ul
              // ref={priorityMenuRef}
              onMouseDown={(e) => e.preventDefault()}
              className="white-shadow absolute -top-40 z-10 mt-1 w-full rounded-2xl bg-base-100 p-1"
            >
              {["urgent", "high", "medium", "low"].map((priority) => (
                <li key={priority}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
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
  )
}

export default TodoEditForm
