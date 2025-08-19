// src/components/todos/TodoListList.jsx
import React, { useState, useRef, useEffect } from "react"
import { FaTrash, FaEdit, FaCaretDown, FaCaretUp, FaEllipsisV, FaPlus } from "react-icons/fa"
import { useTodoStore } from "../../store/useTodoStore"
import { useDeleteTodoList, useUpdateTodoList } from "../../hooks/todoListHooks/useTodoListQueries"
import TodoList from "./TodoList"
import {
  FaBook,
  FaDumbbell,
  FaLightbulb,
  FaPaintBrush,
  FaCheckCircle,
  FaStar,
  FaPen,
  FaUserFriends,
} from "react-icons/fa"
import { useAuthUser } from "../../hooks/authHooks/useAuthUser"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { RxCaretDown, RxCaretUp } from "react-icons/rx"
import { BsThreeDotsVertical } from "react-icons/bs"
import { FaTrashCan } from "react-icons/fa6"
import { FaCheck, FaEllipsisVertical } from "react-icons/fa6"
import { useIsMobile } from "../../hooks/customHooks/useIsMobile"
import SlideUpMenu from "./SlideUpMenu"
import TodoAddForm from "./TodoAddForm"
import LoadingSpinner from "../ui/LoadingSpinner"

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

const TodoListList = ({ todoLists, isLoading, isError, hasNextPage, fetchNextPage }) => {
  const {
    selectedTodoListIds,
    toggleTodoList,
    setCurrentListIdForTodoCreation,
    setShowCreateTodoModal,
    activeTab,
  } = useTodoStore()
  const navigate = useNavigate()
  const { id } = useParams()
  const deleteTodoListMutation = useDeleteTodoList()
  const [openListDropdownId, setOpenListDropdownId] = useState(null)
  const [openTodoDropdownId, setOpenTodoDropdownId] = useState(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { authUser } = useAuthUser()
  const { pathname } = useLocation()

  const observerRef = useRef()
  const lastItemRef = useRef()

  const isMobile = useIsMobile()

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

  useEffect(() => {
    if (isLoading) return
    if (observerRef.current) observerRef.current.disconnect()

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage()
      }
    })

    if (lastItemRef.current) {
      observer.observe(lastItemRef.current)
    }

    observerRef.current = observer
  }, [isLoading, hasNextPage, fetchNextPage])

  const allLists = todoLists?.pages?.flatMap((page) => page.data) || []

  if (isLoading && allLists?.length === 0)
    return (
      <div className="flex h-screen items-center justify-center text-primary">
        <LoadingSpinner />
      </div>
    )

  if (isError) return <div>Error fetching lists.</div>

  if (allLists?.length === 0) {
    return <div className="text-center text-gray-500">List is empty.</div>
  }

  const handleToggleListDropdown = (e, listId) => {
    e.stopPropagation()
    setOpenListDropdownId(openListDropdownId === listId ? null : listId)
    setOpenTodoDropdownId(null) // Close any todo dropdown when a list dropdown is opened
  }

  const handleToggleTodoList = (e, listId) => {
    e.stopPropagation()
    toggleTodoList(listId)
    setOpenListDropdownId(null) // Close list dropdown when a list is opened/closed
    setOpenTodoDropdownId(null) // Close todo dropdown when a list is opened/closed
  }

  const handleOpenMobileForm = (e, listId) => {
    e.stopPropagation()
    setCurrentListIdForTodoCreation(listId)
    setIsMenuOpen(true)
    setOpenListDropdownId(null)
  }

  const handleOpenDesktopForm = (e, listId) => {
    e.stopPropagation()
    e.stopPropagation()
    setCurrentListIdForTodoCreation(listId)
    setShowCreateTodoModal(true)
    setOpenListDropdownId(null)
  }

  const handleCloseMenu = () => {
    setIsMenuOpen(false)
  }

  const isListOpen = (id) => selectedTodoListIds.includes(id)

  return (
    <ul className="flex flex-col gap-5">
      {allLists?.map((list, index) => {
        const isLastItem = index === allLists?.length - 1
        const IconComponent = iconMap[list.icon]

        return (
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
                <div
                  className="flex w-full items-center gap-2"
                  onClick={(e) => handleToggleTodoList(e, list._id)}
                >
                  <span className="flex items-center gap-2 font-bold">
                    {IconComponent && <IconComponent className={`${colorMap[list.color]}`} />}
                    {list.name}
                  </span>
                  <span className="text-xs">{list.totalTodos || ""}</span>
                </div>
                <div className="relative flex gap-1">
                  {list?.todos?.length > 0 && (
                    <button
                      onClick={(e) => handleToggleTodoList(e, list._id)}
                      className="rounded-full p-[5px] transition duration-200 hover:bg-secondary"
                    >
                      {isListOpen(list._id) ? <RxCaretUp size={20} /> : <RxCaretDown size={20} />}
                    </button>
                  )}

                  {list?.owner?._id === authUser._id && (
                    <button
                      className="rounded-full p-[7px] transition duration-200 md:hover:bg-secondary"
                      onClick={(e) => handleToggleListDropdown(e, list._id)}
                    >
                      <FaEllipsisVertical size={16} />
                    </button>
                  )}
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
                            onClick={(e) => {
                              isMobile
                                ? handleOpenMobileForm(e, list._id)
                                : handleOpenDesktopForm(e, list._id)
                            }}
                            className="flex w-full items-center gap-2 rounded-md p-2 transition-colors hover:bg-secondary"
                          >
                            <FaPlus />
                            <span>Add Todo</span>
                          </button>
                        </li>
                        <li>
                          <button
                            onClick={(e) => {
                              e.stopPropagation() // Navigate to edit page with list data
                              navigate(`/todos/edit-todo-section/${list._id}`, { state: { list } })
                              setOpenListDropdownId(null)
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
            {isListOpen(list._id) && (
              <div className="pl-5">
                <TodoList
                  todos={list.todos}
                  openTodoDropdownId={openTodoDropdownId}
                  setOpenTodoDropdownId={setOpenTodoDropdownId}
                />
              </div>
            )}
          </li>
        )
      })}
      {isMobile && isMenuOpen && (
        <SlideUpMenu isOpen={isMenuOpen} onClose={handleCloseMenu}>
          <div className="z-50 flex h-[35vh] w-full flex-col gap-5 px-4">
            <TodoAddForm isLoading={isLoading} setIsMenuOpen={setIsMenuOpen} />
          </div>
        </SlideUpMenu>
      )}
      {isLoading && allLists?.length > 0 && <div>Loading more...</div>}
    </ul>
  )
}

export default TodoListList
