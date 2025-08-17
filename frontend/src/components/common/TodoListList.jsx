import React, { useState, useRef, useEffect } from "react"
import { FaTrash, FaEdit, FaCaretDown, FaCaretUp, FaEllipsisV, FaPlus } from "react-icons/fa"
import { useTodoStore } from "../../store/useTodoStore"
import { useDeleteTodoList } from "../../hooks/todoListHooks/useTodoListQueries"
import TodosInList from "./TodosInList"
import TodoList from "./TodoList"
import {
  FaBook,
  FaDumbbell,
  FaLightbulb,
  FaPaintBrush,
  FaCheckCircle,
  FaStar,
  FaPen,
} from "react-icons/fa"
import { useAuthUser } from "../../hooks/authHooks/useAuthUser"

const iconMap = {
  FaPen: FaPen,
  FaCheckCircle: FaCheckCircle,
  FaStar: FaStar,
  FaBook: FaBook,
  FaDumbbell: FaDumbbell,
  FaLightbulb: FaLightbulb,
  FaPaintBrush: FaPaintBrush,
}

const TodoListList = ({ todoLists, isLoading, isError, hasNextPage, fetchNextPage }) => {
  const {
    selectedTodoListIds,
    toggleTodoList,
    setCurrentListIdForTodoCreation,
    setShowCreateTodoModal,
    activeTab,
  } = useTodoStore()
  const deleteTodoListMutation = useDeleteTodoList()
  const [openDropdownId, setOpenDropdownId] = useState(null) // Intersection Observer for infinite scroll
  const { authUser } = useAuthUser()

  const observerRef = useRef()
  const lastItemRef = useRef()

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

  if (isLoading && allLists.length === 0) return <div>Loading your lists...</div>
  if (isError) return <div>Error fetching lists.</div>
  if (allLists.length === 0) {
    return <div className="text-center text-gray-500">List is empty.</div>
  }

  const toggleDropdown = (id) => {
    setOpenDropdownId(openDropdownId === id ? null : id)
  }

  const isListOpen = (id) => selectedTodoListIds.includes(id)



  return (
    <ul className="flex flex-col gap-6">
      {allLists.map((list, index) => {
        const isLastItem = index === allLists.length - 1
        const IconComponent = iconMap[list.icon]

        return (
          <li key={list._id} className="bg-base-100" ref={isLastItem ? lastItemRef : null}>
            {activeTab !== "myLists" && (
              <div className="flex items-center gap-1">
                <img
                  src={list.owner.profileImg?.imageUrl || "/avatar-placeholder.png"}
                  className="size-8 rounded-full"
                  alt={`${list.owner.username}'s profile`}
                />
                <div className="flex flex-col text-xs">
                  <p>{list.owner.fullName}</p> <p>@{list.owner.username}</p>
                </div>
              </div>
            )}
            <div className="border-b border-slate-600 px-2 py-1">
              <div className="flex justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-2 font-bold">
                    {IconComponent && <IconComponent className={`${colorMap[list.color]}`} />}
                    {list.name}
                  </span>
                  <span className="text-xs">{list.totalTodos || ""}</span>
                </div>
                <div className="flex gap-2">
                  {list.todos.length > 0 && (
                    <button
                      className=""
                      data-tip="View todos"
                      onClick={() => toggleTodoList(list._id)}
                    >
                      {isListOpen(list._id) ? <FaCaretUp /> : <FaCaretDown />}
                    </button>
                  )}
                  <div className="relative">
                    {list.owner._id === authUser._id && (
                      <button
                        className="btn btn-circle btn-ghost btn-sm"
                        onClick={() => toggleDropdown(list._id)}
                      >
                        <FaEllipsisV />
                      </button>
                    )}
                    {openDropdownId === list._id && (
                      <ul className="menu dropdown-content absolute right-0 top-10 z-10 w-40 rounded-box bg-base-100 p-2 shadow">
                        <li>
                          <button
                            onClick={() => {
                              toggleDropdown(null)
                            }}
                          >
                            <FaEdit /> Edit List
                          </button>
                        </li>
                        <li>
                          <button
                            onClick={() => {
                              setCurrentListIdForTodoCreation(list._id)
                              setShowCreateTodoModal(true)
                              toggleDropdown(null)
                            }}
                          >
                            <FaPlus /> Add Todo
                          </button>
                        </li>
                        <li>
                          <button
                            onClick={() => {
                              deleteTodoListMutation.mutate(list._id)
                              toggleDropdown(null)
                            }}
                          >
                            <FaTrash /> Delete List
                          </button>
                        </li>
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {isListOpen(list._id) && (
              <div className="pl-4">
                <TodoList todos={list.todos} />
              </div>
            )}
          </li>
        )
      })}
      {isLoading && allLists.length > 0 && <div>Loading more...</div>}
    </ul>
  )
}

export default TodoListList
