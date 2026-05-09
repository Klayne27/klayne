import { useState, useRef, useCallback, useEffect } from "react" // Added useEffect
import { IoAdd, IoCheckmarkCircle } from "react-icons/io5" // Added IoCalendarOutline
import { FaCalendar, FaFlag } from "react-icons/fa"
import { IoClose } from "react-icons/io5"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { usePomodoroTimerStore } from "../../../store/usePomodoroTimerStore"
import { useGetUserTodoLists } from "../../todos/todoListHooks/useTodoListQueries"
import { useCompleteTodo, useCreateTodo } from "../../todos/todoHooks/useTodoMutations"
import { useTheme } from "../../../context/ThemeContext"
import { showAppToast } from "../../../utils/showAppToast"
import { shouldTextBeWhite } from "../../../utils/shouldTextBeWhite"
import { getPriorityColor, getTextColor } from "../../../utils/todoUtils"
import LoadingSpinner from "../../../components/common/LoadingSpinner"
import { useTodoStore } from "../../../store/useTodoStore"
import CreateTodoListModal from "../../todos/components/CreateTodoListModal"

// --- Smart Date Imports ---
import {
  useDateRecognition,
  formatSuggestedDate,
} from "../../../hooks/customHooks/useDateRecognition"
import DateSuggestionChip from "../../todos/components/DateSuggestionChip"

const QuickTaskPanel = ({ visuallyCompleted, setVisuallyCompleted }) => {
  const { authUser } = useAuthUser()
  const [quickInput, setQuickInput] = useState("")
  const [selectedListId, setSelectedListId] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [dueDate, setDueDate] = useState(null) // New State
  const [hasTime, setHasTime] = useState(false) // ADD THIS STATE
  const inputRef = useRef(null)

  // Preference for clearing title (sync with Modal behavior)
  const [removeDateFromTitle, setRemoveDateFromTitle] = useState(() => {
    const saved = localStorage.getItem("todo_clear_title_pref")
    return saved !== null ? JSON.parse(saved) : true
  })

  const selectedTaskId = usePomodoroTimerStore((s) => s.selectedTaskId)
  const setSelectedTaskId = usePomodoroTimerStore((s) => s.setSelectedTaskId)

  const { myTodoLists, myListsLoading } = useGetUserTodoLists()
  const { createTodo } = useCreateTodo()
  const { completeTodo } = useCompleteTodo()

  const { showCreateTodoListModal, setShowCreateTodoListModal } = useTodoStore()
  const { theme } = useTheme()

  // --- Smart Date Recognition Hook ---
  const {
    result: dateResult,
    dismiss: dismissDate,
    reset: resetDate,
  } = useDateRecognition(quickInput)

  const allLists = myTodoLists?.pages?.flatMap((page) => page.data) ?? []
  const allTodos = allLists.flatMap((list) =>
    list.todos.map((todo) => ({ ...todo, listName: list.name, listId: list._id })),
  )

  const activeLists = allLists.filter((list) => list.todos.length > 0 || true)

  const filteredTodos = allTodos.filter(
    (task) =>
      (!selectedListId || task.listId === selectedListId) &&
      (task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.listName.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  // --- Handlers for Smart Date ---
  const handleAcceptDate = useCallback(() => {
    if (!dateResult) return
    setDueDate(dateResult.date)
    setHasTime(dateResult.hasTime) // STORE THE FLAG

    if (removeDateFromTitle) {
      setQuickInput((prev) => {
        const before = prev.slice(0, dateResult.matchedIndex)
        const after = prev.slice(dateResult.matchedIndex + dateResult.matchedText.length)
        const cleaned = (before + after).replace(/\s{2,}/g, " ").trim()
        return cleaned === "" ? prev : cleaned
      })
    }
    dismissDate()
    inputRef.current?.focus()
  }, [dateResult, removeDateFromTitle, dismissDate])

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      // If a suggestion exists, first Enter accepts it
      if (dateResult) {
        e.preventDefault()
        handleAcceptDate()
      }
      // If no suggestion, the form's onSubmit (handleQuickAdd) triggers naturally
    }
  }

  const handleQuickAdd = useCallback(
    (e) => {
      if (e) e.preventDefault()

      if (!quickInput.trim()) return

      if (!selectedListId) {
        showAppToast("Select a list first", "error")
        return
      }

      createTodo({
        title: quickInput.trim(),
        todoListId: selectedListId,
        priority: "low",
        dueDate: dueDate, // Pass the recognized date
      })

      setQuickInput("")
      setDueDate(null) // Reset date
      setHasTime(false) // RESET FLAG
      resetDate() // Reset hook memory|
      inputRef.current?.focus()
    },
    [quickInput, selectedListId, createTodo, dueDate, resetDate],
  )

  const handleToggleChange = (e) => {
    const newValue = e.target.checked
    setRemoveDateFromTitle(newValue)
    localStorage.setItem("todo_clear_title_pref", JSON.stringify(newValue))
  }

  const handleComplete = useCallback(
    (todoId, e) => {
      e.stopPropagation()
      const task = allTodos.find((t) => t._id === todoId)
      if (!task || task.user !== authUser._id || visuallyCompleted[todoId]) return
      showAppToast("Task done! ✨", "success")
      setVisuallyCompleted((prev) => ({ ...prev, [todoId]: true }))
      completeTodo(todoId)
      if (selectedTaskId === todoId) {
        const idx = allTodos.findIndex((t) => t._id === todoId)
        setSelectedTaskId(allTodos[idx + 1]?._id ?? null)
      }
    },
    [
      allTodos,
      authUser,
      visuallyCompleted,
      selectedTaskId,
      completeTodo,
      setSelectedTaskId,
      setVisuallyCompleted,
    ],
  )

  return (
    <div className="flex w-full max-w-lg flex-col gap-8 px-6 pb-32">
      {/* ── Header & List Selector (Unchanged) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 opacity-70">
            Filter by list
          </h3>
          {myListsLoading && <div className="skeleton h-4 w-12 rounded-full"></div>}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedListId(null)}
            className={`rounded-xl px-4 py-2 text-[11px] font-bold transition-all duration-300 ${
              !selectedListId
                ? `bg-primary ${shouldTextBeWhite(theme)} scale-105 shadow-lg shadow-primary/20`
                : "border border-accent/50 bg-base-200/50 text-slate-500 hover:bg-base-200 hover:text-slate-300"
            }`}
          >
            All Tasks
          </button>

          {activeLists.map((list) => (
            <button
              key={list._id}
              onClick={() => setSelectedListId(list._id === selectedListId ? null : list._id)}
              className={`rounded-xl border px-4 py-2 text-[11px] font-bold transition-all duration-300 ${
                selectedListId === list._id
                  ? `border-primary bg-primary ${shouldTextBeWhite(theme)} scale-105 shadow-lg shadow-primary/20`
                  : "border-white/5 bg-base-200/50 text-slate-500 hover:border-white/10 hover:text-slate-300"
              }`}
            >
              {list.name}
            </button>
          ))}

          <button
            onClick={() => setShowCreateTodoListModal(true)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-slate-500 transition-all hover:bg-white/10 hover:text-white"
          >
            <IoAdd size={18} />
          </button>
        </div>
      </div>

      {/* ── Input & Search Group ── */}
      <div className="flex flex-col gap-3">
        {/* Quick Add */}
        <form
          onSubmit={handleQuickAdd}
          className="group relative flex flex-col rounded-2xl border border-accent/50 p-1 backdrop-blur-md transition-all focus-within:border-primary/40 focus-within:bg-secondary/20 focus-within:ring-4 focus-within:ring-primary/5"
        >
          <div className="flex items-center gap-3 px-3">
            <IoAdd
              className="shrink-0 text-slate-500 transition-colors group-focus-within:text-primary"
              size={22}
            />
            <input
              ref={inputRef}
              type="text"
              enterKeyHint="done"
              value={quickInput}
              onKeyDown={handleInputKeyDown}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder={
                selectedListId
                  ? `Add to ${allLists.find((l) => l._id === selectedListId)?.name}...`
                  : "Select a list to start adding..."
              }
              className="h-12 flex-1 bg-transparent text-sm font-medium placeholder-slate-600 focus:outline-none"
            />

            {/* --- Fixed Date & Time Indicator --- */}
            {dueDate && (
              <div className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                {/* <IoCalendarOutline size={12} /> */}
                <span>{formatSuggestedDate(new Date(dueDate), hasTime)}</span>
                <IoClose
                  className="ml-0.5 cursor-pointer transition-colors hover:text-red-500"
                  onClick={() => {
                    setDueDate(null)
                    setHasTime(false)
                  }}
                />
              </div>
            )}

            <kbd className="hidden rounded bg-accent/30 px-2 py-1 text-[10px] font-bold text-slate-500 md:block">
              ENTER
            </kbd>
          </div>

          {/* Smart Date Suggestion Chip */}
          <div className="px-2">
            <DateSuggestionChip
              result={dateResult}
              onAccept={handleAcceptDate}
              onDismiss={dismissDate}
              onChange={handleToggleChange}
              checked={removeDateFromTitle}
            />
          </div>
        </form>

        {/* Search Bar (Unchanged) */}
        <div className="group relative flex items-center gap-3 rounded-2xl border border-accent/50 px-4 py-1 backdrop-blur-md transition-all focus-within:border-primary/40 focus-within:bg-secondary/20 focus-within:ring-4 focus-within:ring-primary/5">
          <input
            type="text"
            placeholder="Filter tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-transparent px-4 py-2 text-[11px] font-medium text-slate-400 placeholder-slate-700 outline-none ring-0 focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      {/* ── Task Feed (Unchanged) ── */}
      <div className="flex flex-col gap-2.5">
        {filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center py-12 opacity-30">
            <div className="mb-2 h-px w-12 bg-slate-500" />
            <p className="text-[11px] font-bold uppercase tracking-widest">No Targets Found</p>
          </div>
        ) : (
          filteredTodos.map((task) => {
            const isDone = visuallyCompleted[task._id] || task.completed
            const isActive = selectedTaskId === task._id && !isDone

            return (
              <div
                key={task._id}
                onClick={() => !isDone && setSelectedTaskId(task._id)}
                className={`group relative flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all duration-300 ${
                  isActive
                    ? "border-primary/30 bg-primary/5 shadow-[0_0_20px_rgba(var(--p),0.05)]"
                    : isDone
                      ? "border-transparent opacity-40 grayscale"
                      : "border-accent/50 bg-white/[0.02] hover:border-accent/70 hover:bg-secondary/30"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/4 h-1/2 w-1 rounded-full bg-primary" />
                )}

                <div className="flex min-w-0 items-center gap-4">
                  <button
                    onClick={(e) => !isDone && handleComplete(task._id, e)}
                    className="relative shrink-0"
                  >
                    <div
                      className={`h-6 w-6 rounded-full border-2 transition-all group-hover:scale-110 ${getPriorityColor(task.priority)} bg-base-100 shadow-sm`}
                    />
                  </button>

                  <div className="min-w-0">
                    <p className={`truncate text-sm font-bold tracking-tight transition-all`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-tighter text-slate-500">
                        {task.listName}
                      </span>
                      {task.dueDate && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          {/* <FaCalendar size={11} className="opacity-60" /> */}
                          <span className="opacity-70">Due:</span>
                          <span className="text-slate-400">
                            {new Date(task.dueDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="text-primary">
                            {(() => {
                              const d = new Date(task.dueDate)
                              // Detect if a time was saved (not 00:00:00)
                              const taskHasTime = d.getHours() !== 0 || d.getMinutes() !== 0
                              return formatSuggestedDate(d, taskHasTime)
                            })()}
                          </span>
                        </div>
                      )}
                      {isActive && (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter text-primary">
                          <span className="h-1 w-1 animate-pulse rounded-full bg-primary" />
                          Focusing
                        </span>
                      )}
                      {/* Added: Small Due Date display in the feed */}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FaFlag
                    className={`text-[10px] ${getTextColor(task.priority)} opacity-40 transition-opacity group-hover:opacity-100`}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default QuickTaskPanel
