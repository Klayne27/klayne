import { useState, useRef, useEffect } from "react"
import { useTodoStore } from "../../store/useTodoStore"
import { useAuthUser } from "../../hooks/authHooks/useAuthUser"
import { FaCheckCircle } from "react-icons/fa"
import { FaCalendar, FaEllipsisVertical, FaPen } from "react-icons/fa6"
import SlideUpMenu from "./SlideUpMenu"
import { useIsMobile } from "../../hooks/customHooks/useIsMobile"
import Portal from "./Portal"

import { getCompletedColor, getPriorityColor } from "../../utils/todoUtils.jsx"
import TodoEditForm from "./TodoEditForm"
import { FaTrashCan } from "react-icons/fa6"
import { showAppToast } from "../../utils/showAppToast.js"
import { useGetCompletedTodos } from "../../hooks/todoHooks/useGetCompletedTodos.js"
import {useDeleteTodo } from "../../hooks/todoHooks/useDeleteTodo.js"
import { useUpdateTodo } from "../../hooks/todoHooks/useUpdateTodo.js"

function TodoItem({ todo, openTodoDropdownId, setOpenTodoDropdownId }) {
  const { authUser: currentUser } = useAuthUser()
  const { setSelectedTodo, setShowEditTodoModal } = useTodoStore()
  const ellipsisRef = useRef(null)

  const [visuallyCompleted, setVisuallyCompleted] = useState({})
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const isMobile = useIsMobile()

  const { completeTodo, isCompletingTodo } = useGetCompletedTodos()
  const { deleteTodo, isDeletingTodo } = useDeleteTodo()
  const { updateTodo, isUpdatingTodo } = useUpdateTodo()

  useEffect(() => {
    if (openTodoDropdownId === todo._id && ellipsisRef.current) {
      const rect = ellipsisRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + -15,
        left: rect.left + window.scrollX - 155,
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
    if (todo.user !== currentUser._id || isVisuallyCompleted) {
      return
    }
    e.stopPropagation()
    showAppToast("Todo completed! ✨", "success")

    setVisuallyCompleted((prev) => ({ ...prev, [todoId]: true }))

    completeTodo(todoId)
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    deleteTodo(todo._id)
    handleCloseMenu()
    setOpenTodoDropdownId(null)
  }

  const isVisuallyCompleted = visuallyCompleted[todo._id] || todo.completed
  const formattedDueDate = todo.dueDate ? new Date(todo.dueDate).toLocaleDateString() : null
  const isTodoOwner = todo.user === currentUser._id

  return (
    <>
      <li
        onClick={isMobile ? handleMenuToggle : null}
        className={`relative flex items-center justify-between border-b border-accent bg-base-100 py-[3px] pr-6 shadow-sm transition-all duration-500 ease-in-out ${isMobile ? "cursor-pointer" : ""} `}
      >
        <div className="flex items-center gap-2 py-1">
          <button
            onClick={(e) => {
              handleComplete(todo._id, e)
            }}
            className={`flex-shrink-0  rounded-full ${isVisuallyCompleted ? getCompletedColor(todo.priority) : getPriorityColor(todo.priority)} ${getPriorityColor(todo.priority) === "rounded-full border-slate-400" ? "border" : "border-2"} size-5`}
            disabled={isCompletingTodo}
          >
            {isVisuallyCompleted && <FaCheckCircle className="size-4" />}
          </button>
          <div className="flex flex-col gap-[2px]">
            <span className="text-base leading-[16px]">{todo.title}</span>
            <span className="min-w-0 break-words text-xs text-slate-500">{todo.description}</span>
            {formattedDueDate && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <span className="text-[12px]">
                  <FaCalendar />{" "}
                </span>{" "}
                {formattedDueDate}
              </span>
            )}
          </div>
        </div>

        {
          <div className="flex items-center gap-2">
            {!isMobile && (
              <button
                ref={ellipsisRef}
                onClick={handleToggleDropdownMenu}
                className={`rounded-full p-[7px] transition duration-200 md:hover:bg-secondary ${!isTodoOwner && "cursor-not-allowed"}`}
                disabled={!isTodoOwner}
              >
                <FaEllipsisVertical />
              </button>
            )}
          </div>
        }
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
                <span>Edit Todo</span>
              </button>
            </li>

            <li>
              <button
                onClick={handleDelete}
                className="flex w-full items-center gap-2 rounded-md p-2 text-red-400 transition-colors hover:bg-secondary"
              >
                <FaTrashCan />
                <span>Delete Todo</span>
              </button>
            </li>
          </ul>
        </Portal>
      )}

      {/* Mobile Slide Up Menu with Edit Form */}
      {isMobile && isMenuOpen && (
        <SlideUpMenu isOpen={isMenuOpen} onClose={handleCloseMenu}>
          <div className="z-50 flex h-auto w-full flex-col gap-5 overflow-y-auto px-4">
            <TodoEditForm
              todo={todo}
              onClose={handleCloseMenu}
              onDelete={handleDelete}
              onSave={(updateData) => {
                updateTodo(updateData)
                handleCloseMenu()
              }}
              isLoading={isUpdatingTodo || isDeletingTodo}
            />
          </div>
        </SlideUpMenu>
      )}
    </>
  )
}

export default TodoItem
