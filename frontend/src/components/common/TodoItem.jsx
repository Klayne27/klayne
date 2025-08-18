// src/components/todos/TodoItem.jsx
import { useState, useRef, useEffect } from "react"
import { useCompleteTodo, useDeleteTodo, useUpdateTodo } from "../../hooks/todoHooks/useTodoQueries"
import { useTodoStore } from "../../store/useTodoStore"
import { useAuthUser } from "../../hooks/authHooks/useAuthUser"
import { FaCheckCircle } from "react-icons/fa"
import { FaEllipsisVertical, FaPen, FaTrash } from "react-icons/fa6"
import SlideUpMenu from "./SlideUpMenu"
import { useIsMobile } from "../../hooks/customHooks/useIsMobile"
import { FiTrash } from "react-icons/fi"
import Portal from "./Portal"
import TodoEditModal from "./TodoEditModal"
import { showAppToast } from "../../utils/showAppToast"

const getPriorityColor = (priority) => {
  switch (priority) {
    case "urgent":
      return "border-red-400 bg-red-500/30 rounded-full border-2"
    case "high":
      return "border-orange-400 bg-orange-500/30 rounded-full border-2"
    case "medium":
      return "border-yellow-400 bg-yellow-500/30 rounded-full border-2"
    case "low":
    default:
      return "border-slate-400 rounded-full border"
  }
}

const getCompletedColor = (priority) => {
  switch (priority) {
    case "urgent":
      return "text-red-400"
    case "high":
      return "text-orange-400"
    case "medium":
      return "text-yellow-400"
    case "low":
    default:
      return "text-slate-400"
  }
}

function TodoItem({ todo, openTodoDropdownId, setOpenTodoDropdownId }) {
  const { authUser: currentUser } = useAuthUser()
  const { setSelectedTodo, setShowEditTodoModal, showEditTodoModal } = useTodoStore()
  const ellipsisRef = useRef(null)

  const [completingTodoId, setCompletingTodoId] = useState(null)
  const [visuallyCompleted, setVisuallyCompleted] = useState({})
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const isMobile = useIsMobile()

  const { completeTodo, isCompletingTodo } = useCompleteTodo()
  const { deleteTodo, isDeletingTodo } = useDeleteTodo()
  const { updateTodo, isUpdatingTodo } = useUpdateTodo()

  useEffect(() => {
    if (openTodoDropdownId === todo._id && ellipsisRef.current) {
      const rect = ellipsisRef.current.getBoundingClientRect()
      // We position the dropdown relative to the viewport
      // Add scroll position to account for scrolling
      setDropdownPosition({
        top: rect.bottom + window.scrollY + -15, // 5px below the button
        left: rect.left + window.scrollX - 155, // Adjust for dropdown width (approx 160px)
      })
    }
  }, [openTodoDropdownId, todo._id])

  const handleMenuToggle = (e) => {
    if (todo.user !== currentUser._id) return

    e.stopPropagation()
    setIsMenuOpen(!isMenuOpen)
  }

  const handleCloseMenu = () => {
    setIsMenuOpen(false)
  }

  const handleToggleDropdownMenu = (e) => {
    if (todo.user !== currentUser._id) return

    e.stopPropagation()
    setOpenTodoDropdownId(openTodoDropdownId === todo._id ? null : todo._id)
  }

  const handleEdit = (e) => {
    if (e) e.stopPropagation()
    setSelectedTodo(todo)
    setShowEditTodoModal(true)
    handleCloseMenu()
    setOpenTodoDropdownId(null)
  }

  const handleComplete = (todoId, e) => {
    if (todo.user !== currentUser._id) return
    e.stopPropagation()
    setVisuallyCompleted((prev) => ({ ...prev, [todoId]: true }))
    setCompletingTodoId(todoId)
    setTimeout(() => {
      completeTodo(todoId)
    }, 500)
  }

  const handleDelete = (e) => {
    if (e) e.stopPropagation()
    deleteTodo(todo._id)
    handleCloseMenu()
    setOpenTodoDropdownId(null)
  }

  const handleSaveUpdate = (updateData) => {
    updateTodo(updateData)
  }

  const isVisuallyCompleted = visuallyCompleted[todo._id] || todo.completed
  const formattedDueDate = todo.dueDate ? new Date(todo.dueDate).toLocaleDateString() : null

  return (
    <>
      <li
        onClick={isMobile ? handleMenuToggle : null}
        className={`relative flex items-center justify-between border-b border-slate-600 bg-base-100 py-[6px] shadow-sm transition-all duration-500 ease-in-out ${
          completingTodoId === todo._id
            ? "-translate-x-full opacity-0"
            : "translate-x-0 opacity-100"
        } ${isMobile ? "cursor-pointer" : ""} `}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => handleComplete(todo._id, e)}
            className={`${
              isVisuallyCompleted
                ? getCompletedColor(todo.priority)
                : getPriorityColor(todo.priority)
            } size-5`}
            disabled={completingTodoId === todo._id}
          >
            {isVisuallyCompleted && <FaCheckCircle className="size-5" />}
          </button>
          <div className="flex flex-col">
            <span className="text-base">{todo.title}</span>
            {formattedDueDate && (
              <span className="text-xs text-gray-500">Due: {formattedDueDate}</span>
            )}
          </div>
        </div>

        {currentUser && todo.user === currentUser._id && (
          <div className="flex items-center gap-2">
            {!isMobile && (
              <button
                ref={ellipsisRef} // Set the ref on the button
                onClick={handleToggleDropdownMenu}
                className={`rounded-full p-1 ${
                  openTodoDropdownId === todo._id ? "bg-gray-100 dark:bg-gray-700" : ""
                } transition-colors`}
              >
                <FaEllipsisVertical />
              </button>
            )}
          </div>
        )}
      </li>

      {/* Desktop Dropdown Menu - Rendered via Portal */}
      {!isMobile && openTodoDropdownId === todo._id && (
        <Portal>
          <div
            className="fixed inset-0 z-50 cursor-default"
            onClick={() => {
              setOpenTodoDropdownId(null)
            }}
          ></div>
          <ul
            className="white-shadow absolute z-50 w-44 rounded-xl bg-base-100 p-2"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
            }}
          >
            <li>
              <button
                onClick={handleEdit}
                className="flex w-full items-center gap-2 rounded-md p-2 transition-colors hover:bg-secondary"
              >
                <FaPen />
                <span>Edit Task</span>
              </button>
            </li>

            <li>
              <button
                onClick={handleDelete}
                className="flex w-full items-center gap-2 rounded-md p-2 text-red-400 transition-colors hover:bg-secondary"
              >
                <FiTrash />
                <span>Delete Task</span>
              </button>
            </li>
          </ul>
        </Portal>
      )}

      {/* Mobile Slide Up Menu */}
      {isMobile && (
        <SlideUpMenu isOpen={isMenuOpen} onClose={handleCloseMenu}>
          <div className="z-50 flex w-full flex-col gap-5 px-4">
            <div className="flex items-center justify-start gap-2 font-bold">
              <div className={`h-3 w-3 rounded-full ${getPriorityColor(todo.priority)}`} />
              <span className="truncate">{todo.title}</span>
            </div>

            <div className="flex flex-col gap-3 rounded-xl bg-secondary p-3">
              <button
                className="flex w-full items-center gap-2 text-left font-semibold transition duration-200"
                onClick={handleEdit}
                disabled={isUpdatingTodo}
              >
                <FaPen size={16} />
                Edit todo
              </button>
            </div>

            <div className="mb-2 flex flex-col gap-3 rounded-xl bg-secondary p-3">
              <button
                className="flex w-full items-center gap-2 text-left font-semibold text-red-400 transition duration-200"
                onClick={handleDelete}
                disabled={isDeletingTodo}
              >
                <FaTrash size={16} />
                {isDeletingTodo ? "Deleting..." : "Delete todo"}
              </button>
            </div>
          </div>
        </SlideUpMenu>
      )}
    </>
  )
}

export default TodoItem
