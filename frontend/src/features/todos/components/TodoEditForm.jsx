import { useState, useEffect, useRef } from "react"
import { FaCheck, FaFlag, FaTrashCan, FaCalendar } from "react-icons/fa6"
import { getPriorityColor, getTextColor } from "../../../utils/todoUtils.jsx"

import "react-datepicker/dist/react-datepicker.css"
import { IoClose } from "react-icons/io5"
import CustomDatePicker from "../../../components/common/CustomDatePicker.jsx"
import { showAppToast } from "../../../utils/showAppToast.js"
import DateSuggestionChip from "./DateSuggestionChip.jsx"
import { useDateRecognition } from "../../../hooks/customHooks/useDateRecognition.js"

const TodoEditForm = ({ todo, onSave, onDelete, isLoading }) => {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("low")
  const [dueDate, setDueDate] = useState(null)

  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const priorityMenuRef = useRef(null)
  const titleInputRef = useRef(null)

  const [removeDateFromTitle, setRemoveDateFromTitle] = useState(() => {
    const saved = localStorage.getItem("todo_clear_title_pref")
    return saved !== null ? JSON.parse(saved) : true
  })

  // 1. Smart Date Recognition
  const { result: dateResult, dismiss: dismissDate, reset: resetDate } = useDateRecognition(title)

  const handleAcceptDate = () => {
    if (!dateResult) return

    setDueDate(dateResult.date)

    if (removeDateFromTitle) {
      setTitle((prev) => {
        const before = prev.slice(0, dateResult.matchedIndex)
        const after = prev.slice(dateResult.matchedIndex + dateResult.matchedText.length)
        const cleanedTitle = (before + after).replace(/\s{2,}/g, " ").trim()

        // FIX: Prevent title from being wiped if it only contained the date string
        return cleanedTitle === "" ? prev : cleanedTitle
      })
    }

    dismissDate()
    // Small delay ensures mobile keyboards don't glitch on state change
    setTimeout(() => titleInputRef.current?.focus(), 0)
  }

  const handleToggleChange = (e) => {
    const newValue = e.target.checked
    setRemoveDateFromTitle(newValue)
    localStorage.setItem("todo_clear_title_pref", JSON.stringify(newValue))
  }

  useEffect(() => {
    if (todo) {
      const formattedDueDate = todo.dueDate ? new Date(todo.dueDate) : null
      setTitle(todo.title)
      setDescription(todo.description)
      setPriority(todo.priority)
      setDueDate(formattedDueDate)
      resetDate()
    }
  }, [todo, resetDate])

  useEffect(() => {
    function handleClickOutside(event) {
      if (priorityMenuRef.current && !priorityMenuRef.current.contains(event.target)) {
        setIsPriorityMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSubmit = (e) => {
    if (e) e.preventDefault()
    if (!title.trim()) {
      showAppToast("Title can't be empty")
      return
    }

    const updateData = {
      id: todo._id,
      todoData: {
        title: title.trim(),
        description: description,
        dueDate: dueDate ? dueDate.toISOString() : null,
        priority: priority,
      },
    }



    onSave(updateData)
    showAppToast("Task successfully updated", "success")
  }

  const handlePrioritySelect = (priority) => {
    setPriority(priority)
    setIsPriorityMenuOpen(false)
  }

  // 2. Updated Keyboard Logic for Mobile UX
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (dateResult) {
        // First Enter: Accept the smart date suggestion
        e.preventDefault()
        handleAcceptDate()
      }
      // If no suggestion, allow the form onSubmit to trigger naturally
    }
  }

  const handleClearDate = (e) => {
    e.stopPropagation()
    setDueDate(null)
  }

  useEffect(() => {
    titleInputRef.current?.focus()
  }, [])

  // 3. Time Display Logic
  const dueDateObj = dueDate ? new Date(dueDate) : null
  const shouldShowTime =
    dueDateObj && (dueDateObj.getHours() !== 0 || dueDateObj.getMinutes() !== 0)

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
          placeholder="e.g., Update report tomorrow 5pm"
          className="w-full border-b border-gray-300 bg-transparent py-2 text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-white"
        />

        <div className="mt-1">
          <DateSuggestionChip
            result={dateResult}
            onAccept={handleAcceptDate}
            onDismiss={dismissDate}
            onChange={handleToggleChange}
            checked={removeDateFromTitle}
          />
        </div>

        <label className="mt-4 block text-xs font-medium text-gray-500 dark:text-gray-400">
          Description
        </label>
        <input
          type="text"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border-b border-gray-300 bg-transparent py-2 text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-white"
        />

        {/* 4. Enhanced Due Date UI */}
        {dueDate && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <FaCalendar className="text-xs opacity-70" />
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
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClearDate}
              className="ml-auto text-gray-400 hover:text-red-500"
              aria-label="Clear due date"
            >
              <IoClose size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="relative mt-4 flex gap-2">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-sm ${getPriorityColor(priority)}`}
          onClick={(e) => {
            e.stopPropagation()
            setIsPriorityMenuOpen(!isPriorityMenuOpen)
          }}
        >
          <FaFlag className={getTextColor(priority)} />
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
              onMouseDown={(e) => e.preventDefault()}
              className="white-shadow absolute bottom-12 left-0 z-10 mt-1 w-[200px] rounded-2xl border border-gray-100 bg-base-100 p-1 shadow-xl dark:border-gray-700"
            >
              {["urgent", "high", "medium", "low"].map((p) => (
                <li key={p}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handlePrioritySelect(p)}
                    className="flex w-full items-center gap-2 rounded-md p-2 text-sm capitalize text-gray-800 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-gray-600"
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
    </form>
  )
}

export default TodoEditForm
