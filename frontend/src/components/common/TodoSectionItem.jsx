import {
  FaBook,
  FaDumbbell,
  FaLightbulb,
  FaPaintBrush,
  FaCheckCircle,
  FaStar,
  FaPen,
  FaUserFriends,
  FaEdit,
} from "react-icons/fa"
import { useAuthUser } from "../../hooks/authHooks/useAuthUser"
import { useLocation, useNavigate } from "react-router-dom"
import { useDeleteTodoList } from "../../hooks/todoListHooks/useTodoListQueries"
import { useIsMobile } from "../../hooks/customHooks/useIsMobile"
import { useTodoStore } from "../../store/useTodoStore"
import { FaEllipsisVertical, FaPlus, FaTrashCan } from "react-icons/fa6"
import { RxCaretDown, RxCaretUp } from "react-icons/rx"
import TodoList from "./TodoList"

const iconMap = {
  FaPen: FaPen,
  FaCheckCircle: FaCheckCircle,
  FaStar: FaStar,
  FaBook: FaBook,
  FaDumbbell: FaDumbbell,
  FaLightbulb: FaLightbulb,
  FaPaintBrush: FaPaintBrush,
  FaUserFriends: FaUserFriends,
}

const colorMap = {
  red: "text-red-400",
  orange: "text-orange-400",
  yellow: "text-yellow-400",
  emerald: "text-emerald-400",
  teal: "text-teal-400",
  cyan: "text-cyan-400",
  blue: "text-blue-400",
  violet: "text-violet-400",
  fuchsia: "text-fuchsia-400",
  pink: "text-pink-400",
  slate: "text-slate-400",
  stone: "text-stone-400",
}

const TodoSectionItem = ({
  list,
  isLastItem,
  lastItemRef,
  openListDropdownId,
  setOpenListDropdownId,
  openTodoDropdownId,
  setOpenTodoDropdownId,
  setIsMenuOpen,
  setShowCreateTodoModal,
}) => {
  const {
    selectedTodoListIds,
    toggleTodoList,
    setCurrentListIdForTodoCreation,
    showEditTodoListModal,
    setShowEditTodoListModal,
    setTodoListToEdit,
    todoListToEdit,
  } = useTodoStore()
  const { authUser } = useAuthUser()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const deleteTodoListMutation = useDeleteTodoList()
  const isMobile = useIsMobile()

  const IconComponent = iconMap[list.icon]
  const isListOpen = selectedTodoListIds.includes(list._id)

  const handleToggleListDropdown = (e) => {
    e.stopPropagation()
    setOpenListDropdownId(openListDropdownId === list._id ? null : list._id)
    setOpenTodoDropdownId(null)
  }

  const handleToggleTodoList = (e) => {
    e.stopPropagation()
    toggleTodoList(list._id)
    setOpenListDropdownId(null)
    setOpenTodoDropdownId(null)
  }

  const handleOpenMobileForm = (e) => {
    e.stopPropagation()
    setCurrentListIdForTodoCreation(list._id)
    setIsMenuOpen(true)
    setOpenListDropdownId(null)
  }

  const handleOpenDesktopForm = (e) => {
    e.stopPropagation()
    setCurrentListIdForTodoCreation(list._id)
    setShowCreateTodoModal(true)
    setOpenListDropdownId(null)
  }

  const handleEditClick = (e) => {
    e.stopPropagation()
    setTodoListToEdit(list)
    setShowEditTodoListModal(true)
    setOpenListDropdownId(null)
  }

  const isListOwner = list?.owner?._id === authUser?._id

  return (
    <>
      <li key={list._id} className="bg-base-100" ref={isLastItem ? lastItemRef : null}>
        {pathname.startsWith("/todos/") && (
          <div className="flex items-center gap-3 p-2">
            <img
              src={list.owner.profileImg?.imageUrl || "/avatar-placeholder.png"}
              className="size-8 rounded-full object-cover"
              alt={`${list.owner.username}'s profile`}
            />
            <div className="flex flex-col">
              <p className="text-sm font-bold">{list.owner.fullName}</p>
              <p className="text-xs text-gray-500">@{list.owner.username}</p>
            </div>
          </div>
        )}
        <div className="border-b border-slate-600 px-3 py-1">
          <div className="flex justify-between">
            <div className="flex w-full items-center gap-2" onClick={handleToggleTodoList}>
              <span className="flex items-center gap-2 font-bold">
                {IconComponent ? <IconComponent className={`${colorMap[list.color]}`} /> : ""}
                {list.name}
              </span>
              <span className="text-xs">{list.totalTodos || ""}</span>
            </div>
            <div className="relative flex gap-1">
              {list?.todos?.length > 0 && (
                <button
                  onClick={handleToggleTodoList}
                  className="rounded-full p-[5px] transition duration-200 hover:bg-secondary"
                >
                  {isListOpen ? <RxCaretUp size={20} /> : <RxCaretDown size={20} />}
                </button>
              )}

              {
                <button
                  className={`rounded-full p-[7px] transition duration-200 md:hover:bg-secondary ${!isListOwner && "cursor-not-allowed"}`}
                  onClick={handleToggleListDropdown}
                  disabled={!isListOwner}
                >
                  <FaEllipsisVertical size={16} />
                </button>
              }
              {openListDropdownId === list._id && (
                <>
                  <div
                    className="fixed inset-0 z-10 cursor-default bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenListDropdownId(null)
                    }}
                  ></div>
                  <ul className="white-shadow absolute right-2 top-3 z-10 w-44 rounded-xl bg-base-100 p-2">
                    <li>
                      <button
                        onClick={(e) =>
                          isMobile ? handleOpenMobileForm(e) : handleOpenDesktopForm(e)
                        }
                        className="flex w-full items-center gap-2 rounded-md p-2 transition-colors hover:bg-secondary"
                      >
                        <FaPlus />
                        <span>Add Todo</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={(e) => {
                          isMobile
                            ? navigate(`/todos/edit-todo-section/${list._id}`, { state: { list } })
                            : handleEditClick(e)
                        }}
                        className="flex w-full items-center gap-2 rounded-md p-2 transition-colors hover:bg-secondary"
                      >
                        <FaEdit />
                        <span>Edit Section</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteTodoListMutation.mutate(list._id)
                          setOpenListDropdownId(null)
                        }}
                        className="flex w-full items-center gap-2 rounded-md p-2 text-red-400 transition-colors hover:bg-secondary"
                      >
                        <FaTrashCan />
                        <span>Delete Section</span>
                      </button>
                    </li>
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
        {isListOpen && (
          <div className="pl-5">
            <TodoList
              todos={list.todos}
              openTodoDropdownId={openTodoDropdownId}
              setOpenTodoDropdownId={setOpenTodoDropdownId}
            />
          </div>
        )}
      </li>
    </>
  )
}

export default TodoSectionItem
