import { useState, useRef, useEffect } from "react"
import { useTodoStore } from "../../../store/useTodoStore.js"
import { FaCheckCircle } from "react-icons/fa"
import { FaCalendar, FaEllipsisVertical, FaPen } from "react-icons/fa6"
import SlideUpMenu from "../../../components/common/SlideUpMenu.jsx"
import { useIsMobile } from "../../../hooks/customHooks/useIsMobile.js"
import Portal from "../../../components/common/Portal.jsx"

import { getCompletedColor, getPriorityColor } from "../../../utils/todoUtils.jsx"
import TodoEditForm from "./TodoEditForm"
import { FaTrashCan } from "react-icons/fa6"
import { showAppToast } from "../../../utils/showAppToast.js"

import { useAuthUser } from "../../auth/authHooks/useAuthUser.js"
import { useCompleteTodo, useDeleteTodo, useUpdateTodo } from "../todoHooks/useTodoMutations.js"
import { useSound } from "../../../hooks/customHooks/useSound.js"

function TodoItem({ todo, openTodoDropdownId, setOpenTodoDropdownId }) {
  const { authUser: currentUser } = useAuthUser()
  const { setSelectedTodo, setShowEditTodoModal, isEditTodoMenuOpen, setIsEditTodoMenuOpen } =
    useTodoStore()
  const ellipsisRef = useRef(null)

  // const { play: playComplete } = useSound("/sounds/confirmation-003.mp3", 0.6)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)

  const [visuallyCompleted, setVisuallyCompleted] = useState({})
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const isMobile = useIsMobile()

  const { completeTodo, isCompletingTodo } = useCompleteTodo()
  const { deleteTodo, isDeletingTodo } = useDeleteTodo()
  const { updateTodo, isUpdatingTodo } = useUpdateTodo()

  // useEffect(() => {
  //   if (openTodoDropdownId === todo._id && ellipsisRef.current) {
  //     const rect = ellipsisRef.current.getBoundingClientRect()
  //     setDropdownPosition({
  //       top: rect.bottom + window.scrollY + -15,
  //       left: rect.left + window.scrollX - 155,
  //     })
  //   }
  // }, [openTodoDropdownId, todo._id])

  const shouldShowMobileMenu = isEditTodoMenuOpen === todo._id

  const handleMenuToggle = (e) => {
    if (todo.user !== currentUser._id) return
    e.stopPropagation()
    // Set the global state to the current todo's ID, or null if it's already open
    setIsEditTodoMenuOpen(shouldShowMobileMenu ? null : todo._id)
  }

  const handleCloseMenu = () => {
    setIsEditTodoMenuOpen(null)
  }

  const handleEdit = (e) => {
    if (e) e.stopPropagation()
    setSelectedTodo(todo)
    setShowEditTodoModal(true)
    handleCloseMenu() // This will set the state back to null
    setOpenTodoDropdownId(null)
  }

  const handleToggleDropdownMenu = (e) => {
    if (todo.user !== currentUser._id) return

    e.stopPropagation()
    setOpenTodoDropdownId(openTodoDropdownId === todo._id ? null : todo._id)
  }

const handleComplete = (todoId, e) => {
  if (todo.user !== currentUser._id || isVisuallyCompleted || isAnimatingOut) {
    return
  }
  e.stopPropagation()

  // Trigger Sound
  // playComplete()
  // Trigger local animation
  setIsAnimatingOut(true)

  // Delay the actual backend call/cache removal to let animation finish
  setTimeout(() => {
    completeTodo(todoId)
    showAppToast("Todo completed! ✨", "success")
  }, 400)
}

  const handleDelete = (e) => {
    e.stopPropagation()
    deleteTodo(todo._id)
    handleCloseMenu()
    setOpenTodoDropdownId(null)
  }

  const isVisuallyCompleted = todo.completed || isAnimatingOut
  // const formattedDueDate = todo.dueDate ? new Date(todo.dueDate).toLocaleDateString() : null
  const isTodoOwner = todo.user === currentUser._id
  
  const dueDateObj = todo.dueDate ? new Date(todo.dueDate) : null

  const formattedDate = dueDateObj
    ? dueDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null

  // Only show time if hours or minutes are not zero (meaning a specific time was set)
  const hasTime = dueDateObj && (dueDateObj.getHours() !== 0 || dueDateObj.getMinutes() !== 0)

  const formattedTime = hasTime
    ? dueDateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : null
    

    // Only show time if it's NOT exactly midnight
    const shouldShowTime =
      dueDateObj &&
      (dueDateObj.getHours() !== 0 ||
        dueDateObj.getMinutes() !== 0 ||
        dueDateObj.getSeconds() !== 0)

  return (
    <div className="relative overflow-hidden">
      {" "}
      {/* Added overflow-hidden to contain the slide */}
      <li
        onClick={isMobile ? handleMenuToggle : null}
        className={`relative flex items-center justify-between border-b border-accent bg-base-100 py-[3px] pr-6 shadow-sm transition-all duration-500 ease-in-out ${isMobile ? "cursor-pointer" : ""} ${isAnimatingOut ? "translate-x-full skew-x-12 opacity-0" : "translate-x-0 opacity-100"} `}
      >
        <div className="flex items-center gap-2 py-1">
          <button
            onClick={(e) => handleComplete(todo._id, e)}
            className={`flex flex-shrink-0 items-center justify-center rounded-full transition-all duration-300 ${isVisuallyCompleted ? getCompletedColor(todo.priority) : getPriorityColor(todo.priority)} ${getPriorityColor(todo.priority) === "rounded-full border-slate-400" ? "border" : "border-2"} size-5 ${isAnimatingOut ? "scale-125 animate-ping" : ""}`}
            disabled={isCompletingTodo || isAnimatingOut}
          >
            {isVisuallyCompleted && <FaCheckCircle className="size-4 text-success" />}
          </button>

          <div className="flex flex-col gap-[2px] transition-all">
            <span
              className={`text-base leading-[16px] transition-all duration-300 ${isAnimatingOut ? "line-through opacity-40" : ""}`}
            >
              {todo.title}
            </span>
            <span className="min-w-0 break-words text-xs text-slate-500">{todo.description}</span>
            {formattedDate && (
              <span className="flex items-center gap-1 text-xs">
                <span className="text-[12px] text-slate-500">
                  <FaCalendar />
                </span>
                <span className="text-slate-500">{formattedDate}</span>
                {shouldShowTime && (
                  <span className="ml-1 font-medium text-primary">at {formattedTime}</span>
                )}
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
        <>
          <div
            className="fixed inset-0 z-50 cursor-default"
            onClick={() => {
              setOpenTodoDropdownId(null)
            }}
          ></div>
          <ul
            className="white-shadow absolute right-9 top-12 z-50 w-48 rounded-xl bg-base-100 p-2"
            style={{
              animation: "fadeInSlideDown 0.2s ease-out forwards",
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
        </>
      )}
      {/* Mobile Slide Up Menu with Edit Form */}
      {shouldShowMobileMenu && (
        <SlideUpMenu isOpen={isEditTodoMenuOpen} onClose={handleCloseMenu}>
          <div className="z-20 flex h-auto w-full flex-col gap-5 overflow-y-auto px-4">
            <TodoEditForm
              todo={todo}
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
    </div>
  )
}

export default TodoItem
