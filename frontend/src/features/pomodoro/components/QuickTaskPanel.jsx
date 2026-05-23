import { useState, useRef, useCallback, useEffect } from "react" // Added useEffect
import { IoAdd } from "react-icons/io5" // Added IoCalendarOutline
import { FaCalendar, FaCheckCircle, FaFlag } from "react-icons/fa"
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
import { useSelectTask } from "../pomodoroHooks/usePomodoroMutations"
import { useSound } from "../../../hooks/customHooks/useSound"

const QuickTaskPanel = () => {
  const { authUser } = useAuthUser()
  const [quickInput, setQuickInput] = useState("")
  const [selectedListId, setSelectedListId] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [dueDate, setDueDate] = useState(null)
  const [hasTime, setHasTime] = useState(false)
  const [isTasksVisible, setIsTasksVisible] = useState(true)

  const inputRef = useRef(null)
  const [completingId, setCompletingId] = useState(null) // Add this state
  const { play: playComplete } = useSound("/sounds/confirmation-003.mp3", 0.6) // Add this hook
  const { play: playClickTask } = useSound("/sounds/drop-002.mp3", 1) // Add this hook

  const [removeDateFromTitle, setRemoveDateFromTitle] = useState(() => {
    const saved = localStorage.getItem("todo_clear_title_pref")
    return saved !== null ? JSON.parse(saved) : true
  })

  const selectedTaskId = usePomodoroTimerStore((s) => s.selectedTaskId)
  const setSelectedTaskId = usePomodoroTimerStore((s) => s.setSelectedTaskId) // keep for store reads
  const selectTask = useSelectTask()

  const { myTodoLists, myListsLoading } = useGetUserTodoLists()
  const { createTodo } = useCreateTodo()
  const { completeTodo } = useCompleteTodo()

  const { showCreateTodoListModal, setShowCreateTodoListModal } = useTodoStore()
  const { theme } = useTheme()

  const {
    result: dateResult,
    dismiss: dismissDate,
    reset: resetDate,
  } = useDateRecognition(quickInput)

  const allLists = myTodoLists?.pages?.flatMap((page) => page.data) ?? []
  const allTodos = allLists.flatMap((list) =>
    list.todos.map((todo) => ({ ...todo, listName: list.name, listId: list._id })),
  )

  const activeLists = allLists
  const filteredTodos = allTodos.filter(
    (task) =>
      !task.completed &&
      (!selectedListId || task.listId === selectedListId) &&
      (task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.listName.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const handleAcceptDate = useCallback(() => {
    if (!dateResult) return
    setDueDate(dateResult.date)
    setHasTime(dateResult.hasTime)
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
    if (e.key === "Enter" && dateResult) {
      e.preventDefault()
      handleAcceptDate()
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

      createTodo({ title: quickInput.trim(), todoListId: selectedListId, priority: "low", dueDate })
      setQuickInput("")
      setDueDate(null)
      setHasTime(false)
      resetDate()
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
      if (!task || task.user !== authUser._id) return

      // 1. Play sound and trigger animation state
      playComplete()
      setCompletingId(todoId)

      // 2. Wait for animation to finish before updating cache
      setTimeout(() => {
        completeTodo(todoId)

        if (selectedTaskId === todoId) {
          const idx = allTodos.findIndex((t) => t._id === todoId)
          const next = allTodos.slice(idx + 1).find((t) => !t.completed)
          selectTask(next?._id ?? null)
        }

        setCompletingId(null)
      }, 400) // Duration matches the transition-all duration
    },
    [allTodos, authUser, completeTodo, selectTask, selectedTaskId],
  )

  const handleClickTask = (taskId) => {
    playClickTask()
    selectTask(taskId)
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-8 px-6 pb-32">
      {/* List selector */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 opacity-70">
            Filter by list
          </h3>
          {myListsLoading && <div className="skeleton h-4 w-12 rounded-full" />}
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

      {/* Quick add + search */}
      <div className="flex flex-col gap-3">
        <form
          onSubmit={handleQuickAdd}
          className="group relative flex flex-col rounded-2xl border border-accent/50 p-1 backdrop-blur-sm transition-all focus-within:border-primary/40 focus-within:bg-secondary/20 focus-within:ring-4 focus-within:ring-primary/5"
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
            {dueDate && (
              <div className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
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

        <div className="group relative flex items-center gap-3 rounded-2xl border border-accent/50 px-4 py-1 backdrop-blur-sm transition-all focus-within:border-primary/40 focus-within:bg-secondary/20 focus-within:ring-4 focus-within:ring-primary/5">
          <input
            type="text"
            placeholder="Filter tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-transparent px-4 py-2 text-[11px] font-medium text-slate-400 placeholder-slate-700 outline-none focus:outline-none"
          />
        </div>
      </div>

      {/* Task feed */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 opacity-70">
            {filteredTodos.length} task{filteredTodos.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setIsTasksVisible((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors hover:bg-secondary/50"
          >
            {isTasksVisible ? "Hide" : "Show"}
            <span
              className={`inline-block transition-transform duration-300 ${isTasksVisible ? "rotate-0" : "-rotate-90"}`}
            >
              ▾
            </span>
          </button>
        </div>
        {isTasksVisible &&
          (filteredTodos.length === 0 ? (
            <div className="flex flex-col items-center py-12 opacity-30">
              <div className="mb-2 h-px w-12 bg-slate-500" />
              <p className="text-[11px] font-bold uppercase tracking-widest">No Targets Found</p>
            </div>
          ) : (
            filteredTodos.map((task) => {
              const isActive = selectedTaskId === task._id
              const isCompleting = completingId === task._id // New helper variable

              return (
                <div
                  key={task._id}
                  onClick={() => !isCompleting && handleClickTask(task._id)}
                  className={`group relative flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all duration-500 ${
                    isCompleting
                      ? "translate-x-8 skew-x-2 scale-95 opacity-0" // Animation when completing
                      : isActive
                        ? "border-primary/30 bg-primary/5 shadow-[0_0_20px_rgba(var(--p),0.05)]"
                        : "border-accent/50 bg-white/[0.02] hover:border-accent/70 hover:bg-secondary/30"
                  }`}
                >
                  {isActive && !isCompleting && (
                    <div className="absolute left-0 top-1/4 h-1/2 w-1 rounded-full bg-primary" />
                  )}

                  <div className="flex min-w-0 items-center gap-4">
                    <button
                      onClick={(e) => handleComplete(task._id, e)}
                      disabled={isCompleting}
                      className="relative shrink-0"
                    >
                      <div
                        className={`h-6 w-6 rounded-full border-2 bg-base-100 shadow-sm transition-all ${
                          isCompleting
                            ? "animate-ping border-success bg-success/20"
                            : `${getPriorityColor(task.priority)} group-hover:scale-110`
                        }`}
                      />
                      {isCompleting && (
                        <FaCheckCircle className="absolute inset-0 size-6 animate-pulse text-success" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <p
                        className={`truncate text-sm font-bold tracking-tight transition-all duration-300 ${
                          isCompleting ? "line-through opacity-50" : ""
                        }`}
                      >
                        {task.title}
                      </p>

                      {/* ... Meta info (list name, due date, etc) ... */}
                      <div className="flex items-center gap-2">
                        {/* Wrap existing meta info in a div that fades out during completion */}
                        <div
                          className={`flex items-center gap-2 transition-opacity ${isCompleting ? "opacity-0" : "opacity-100"}`}
                        >
                          <span className="text-[9px] font-black uppercase tracking-tighter text-slate-500">
                            {task.listName}
                          </span>
                          {task.dueDate && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                              <span className="opacity-70">Due:</span>
                              <span>
                                {new Date(task.dueDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                              <span className="text-primary">
                                {(() => {
                                  const d = new Date(task.dueDate)
                                  const taskHasTime = d.getHours() !== 0 || d.getMinutes() !== 0
                                  return formatSuggestedDate(d, taskHasTime)
                                })()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Flag Icon */}
                  <div
                    className={`flex items-center gap-3 transition-opacity ${isCompleting ? "opacity-0" : "opacity-100"}`}
                  >
                    <FaFlag
                      className={`text-[10px] ${getTextColor(task.priority)} opacity-40 transition-opacity group-hover:opacity-100`}
                    />
                  </div>
                </div>
              )
            })
          ))}
      </div>
    </div>
  )
}

export default QuickTaskPanel
