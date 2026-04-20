import { useState, useRef, useCallback } from "react"
import { IoAdd, IoCheckmarkCircle } from "react-icons/io5"
import { FaFlag } from "react-icons/fa"
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

const QuickTaskPanel = ({ visuallyCompleted, setVisuallyCompleted }) => {
  const { authUser } = useAuthUser()
  const [quickInput, setQuickInput] = useState("")
  const [selectedListId, setSelectedListId] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const inputRef = useRef(null)

  const selectedTaskId = usePomodoroTimerStore((s) => s.selectedTaskId)
  const setSelectedTaskId = usePomodoroTimerStore((s) => s.setSelectedTaskId)

  const { myTodoLists, myListsLoading } = useGetUserTodoLists()
  const { createTodo } = useCreateTodo()
  const { completeTodo } = useCompleteTodo()

  const { showCreateTodoListModal, setShowCreateTodoListModal } = useTodoStore()

  const { theme } = useTheme()

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

  const selectedTask = allTodos.find((t) => t._id === selectedTaskId)

  const handleQuickAdd = useCallback(
    (e) => {
      if (e.key !== "Enter" || !quickInput.trim()) return
      if (!selectedListId) {
        showAppToast("Select a list first", "error")
        return
      }
      createTodo({ title: quickInput.trim(), todoListId: selectedListId, priority: "low" })
      setQuickInput("")
      inputRef.current?.focus()
    },
    [quickInput, selectedListId, createTodo],
  )

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
    <>
      <div className="flex w-full max-w-md flex-col gap-4 px-4 pb-28">
        {/* List pill selector */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Filter by List
          </p>
          {myListsLoading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedListId(null)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  !selectedListId
                    ? `bg-primary ${shouldTextBeWhite(theme)}`
                    : "bg-base-200 text-slate-400 hover:bg-base-300"
                }`}
              >
                All
              </button>
              {activeLists.map((list) => (
                <button
                  key={list._id}
                  onClick={() => setSelectedListId(list._id === selectedListId ? null : list._id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                    selectedListId === list._id
                      ? `bg-primary ${shouldTextBeWhite(theme)}`
                      : "bg-base-200 text-slate-400 hover:bg-base-300"
                  }`}
                >
                  {list.name}
                </button>
              ))}

              <button
                onClick={() => setShowCreateTodoListModal(true)}
                className="rounded-full bg-base-200 px-2 py-1 text-xs font-semibold  transition-all hover:bg-base-300"
              >
                +
              </button>
            </div>
          )}
        </div>

        {/* Quick-add input */}
        <div className="relative flex items-center gap-2 rounded-xl border border-slate-700 bg-base-200/60 px-4 py-3 backdrop-blur-sm transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30">
          <IoAdd className="shrink-0 text-slate-500" size={18} />
          <input
            ref={inputRef}
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            onKeyDown={handleQuickAdd}
            placeholder={
              selectedListId
                ? `Quick-add to "${allLists.find((l) => l._id === selectedListId)?.name}"…`
                : "Select a list, then type + Enter to add"
            }
            className="flex-1 bg-transparent text-sm placeholder-slate-600 focus:outline-none"
            // disabled={isCreatingTodo}
          />
          {/* {isCreatingTodo && <LoadingSpinner size="xs" />} */}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search tasks…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-800 bg-base-200/60 px-4 py-2.5 text-sm placeholder-slate-600 backdrop-blur-sm transition-all focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
        />

        {/* Task list */}
        <div className="flex flex-col gap-2">
          {filteredTodos.length === 0 && (
            <p className="py-8 text-center text-sm italic text-slate-600">
              {searchQuery ? "No tasks match your search." : "No tasks yet. Add one above!"}
            </p>
          )}
          {filteredTodos.map((task) => {
            const isDone = visuallyCompleted[task._id] || task.completed
            return (
              <div
                key={task._id}
                onClick={() => !isDone && setSelectedTaskId(task._id)}
                className={`group flex cursor-pointer items-center justify-between rounded-xl p-3.5 transition-all duration-200 ${
                  selectedTaskId === task._id
                    ? "bg-primary/10 ring-2 ring-primary"
                    : isDone
                      ? "cursor-default opacity-40"
                      : "bg-base-200/60 backdrop-blur-sm hover:bg-base-200"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    onClick={(e) => !isDone && handleComplete(task._id, e)}
                    className={`shrink-0 transition-colors ${isDone ? "text-primary" : "text-slate-600 hover:text-primary"}`}
                  >
                    {isDone ? (
                      <IoCheckmarkCircle size={20} className="text-primary" />
                    ) : (
                      <div
                        className={`h-5 w-5 rounded-full border-2 ${getPriorityColor(task.priority)}`}
                      />
                    )}
                  </button>
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${isDone ? "line-through" : ""}`}>
                      {task.title}
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-tight text-slate-500">
                      {task.listName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTaskId === task._id && !isDone && (
                    <span className="animate-pulse text-[9px] font-black uppercase tracking-wide text-primary">
                      Active
                    </span>
                  )}
                  <FaFlag
                    className={`shrink-0 text-xs ${getTextColor(task.priority)} opacity-60`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {/* {showCreateTodoListModal && (
        <CreateTodoListModal onClose={() => setShowCreateTodoListModal(false)} />
      )} */}
    </>
  )
}

export default QuickTaskPanel
