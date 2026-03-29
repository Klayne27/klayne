import { FaEdit } from "react-icons/fa"
import { useAuthUser } from "../auth/authHooks/useAuthUser"
import { useLocation, useNavigate } from "react-router-dom"
import { useDeleteTodoList } from "./todoListHooks/useDeleteTodoList"
import { useLikeUnlikeTodoList } from "./todoListHooks/useLikeUnlikeTodoList"
import { useIsMobile } from "../../hooks/customHooks/useIsMobile"
import { useTodoStore } from "../../store/useTodoStore"
import { FaEllipsisVertical, FaPlus, FaTrashCan, FaHeart, FaRegHeart } from "react-icons/fa6"
import { RxCaretDown, RxCaretUp } from "react-icons/rx"
import TodoList from "./TodoList"
import AnimatedCount from "../../components/common/AnimatedCount"
import { useTouchHoverEffect } from "../../hooks/customHooks/useTouchHoverEffect"
import { useState } from "react"
import { useEffect } from "react"
import { forwardRef } from "react"
import { colorMap, iconMap } from "../../utils/todoUtils"
import { getOptimizedImageUrl } from "../../utils/cloudinaryUtils"

const TodoSectionItem = forwardRef(
  (
    {
      list,
      openListDropdownId,
      setOpenListDropdownId,
      openTodoDropdownId,
      setOpenTodoDropdownId,
      setIsMenuOpen,
      setShowCreateTodoModal,
    },
    ref,
  ) => {
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

    const [isAnimatingLike, setIsAnimatingLike] = useState(false)

    const navigate = useNavigate()
    const { deleteTodoList, deletingTodoList } = useDeleteTodoList()
    const { likeUnlikeTodoList, isLiking } = useLikeUnlikeTodoList()
    const isMobile = useIsMobile()

    const IconComponent = iconMap[list?.icon]
    const isListOpen = selectedTodoListIds.includes(list?._id)

    const { isTouchDevice, activeButtonId, handleTouchCancel, handleTouchEnd, handleTouchStart } =
      useTouchHoverEffect()

    const isLiked = list?.likes?.includes(authUser?._id)

    const handleToggleListDropdown = (e) => {
      e.stopPropagation()
      setOpenListDropdownId(openListDropdownId === list?._id ? null : list?._id)
      setOpenTodoDropdownId(null)
    }

    const handleToggleTodoList = (e) => {
      e.stopPropagation()
      toggleTodoList(list?._id)
      setOpenListDropdownId(null)
      setOpenTodoDropdownId(null)
    }

    const handleOpenMobileForm = (e) => {
      e.stopPropagation()
      setCurrentListIdForTodoCreation(list?._id)
      setIsMenuOpen(true)
      setOpenListDropdownId(null)
    }

    const handleOpenDesktopForm = (e) => {
      e.stopPropagation()
      setCurrentListIdForTodoCreation(list?._id)
      setShowCreateTodoModal(true)
      setOpenListDropdownId(null)
    }

    const handleEditClick = (e) => {
      e.stopPropagation()
      setTodoListToEdit(list)
      setShowEditTodoListModal(true)
      setOpenListDropdownId(null)
    }

    const handleLikeList = (e) => {
      e.stopPropagation()
      setIsAnimatingLike(true)

      if (isLiking) return
      likeUnlikeTodoList({ listId: list?._id, authUserId: authUser._id })
    }

    useEffect(() => {
      let timerLike

      if (isAnimatingLike) {
        timerLike = setTimeout(() => {
          setIsAnimatingLike(false)
        }, 400)
      }

      return () => {
        clearTimeout(timerLike)
      }
    }, [isAnimatingLike])

    const isListOwner = list?.owner?._id === authUser?._id

    return (
      <>
        <li className="bg-base-100" ref={ref}>
          {pathname.startsWith("/todos/") && (
            <div className="flex items-center gap-3 p-2">
              <img
                src={getOptimizedImageUrl(list?.owner.profileImg?.imageUrl || "/avatar-placeholder.png", "avatar")}
                className="size-8 rounded-full object-cover"
                alt={`${list?.owner.username}'s profile`}
              />
              <div className="flex flex-col">
                <p className="text-sm font-bold">{list?.owner.fullName}</p>
                <p className="text-xs text-gray-500">@{list?.owner.username}</p>
              </div>
              <div
                className="group flex cursor-pointer items-center rounded-full"
                onClick={handleLikeList}
                onTouchStart={() => handleTouchStart("like")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                <div
                  className={`relative rounded-full p-2 transition duration-200 ${
                    !isTouchDevice ? "group-hover:bg-pink-600 group-hover:bg-opacity-15" : ""
                  } ${
                    isTouchDevice && activeButtonId === "like" ? "bg-pink-600 bg-opacity-15" : ""
                  } cursor-pointer`}
                >
                  {!isLiked && (
                    <FaRegHeart
                      className={`h-4 w-4 text-slate-500 transition duration-200 group-hover:text-pink-600 ${isAnimatingLike && !isLiked ? "animate-like-bounce" : ""} `}
                    />
                  )}
                  {isLiked && (
                    <FaHeart
                      strokeWidth={10}
                      className={`h-4 w-4 text-pink-600 transition duration-200 ${isAnimatingLike && isLiked ? "animate-like-bounce" : ""} `}
                    />
                  )}
                </div>
                <AnimatedCount
                  count={list?.likes?.length || 0}
                  className={`absolute text-sm transition duration-200 group-hover:text-pink-600 ${
                    isLiked ? "text-pink-600" : "text-slate-500"
                  }`}
                />
              </div>
            </div>
          )}

          <div className="border-b border-accent px-3 py-1">
            <div className="flex justify-between">
              <div className="flex w-full items-center gap-2" onClick={handleToggleTodoList}>
                <span className="flex items-center gap-2 font-bold">
                  {IconComponent ? <IconComponent className={`${colorMap[list?.color]}`} /> : ""}
                  {list?.name}
                </span>
                <span className="text-xs">{list?.todos.length || ""}</span>
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
                {openListDropdownId === list?._id && (
                  <>
                    <div
                      className="fixed inset-0 z-50 cursor-default bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenListDropdownId(null)
                      }}
                    ></div>
                    <ul className="white-shadow absolute right-2 top-3 z-50 w-44 rounded-xl bg-base-100 p-2">
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
                              ? navigate(`/todos/edit-todo-section/${list?._id}`, {
                                  state: { list },
                                })
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
                            deleteTodoList(list?._id)
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
                todos={list?.todos}
                openTodoDropdownId={openTodoDropdownId}
                setOpenTodoDropdownId={setOpenTodoDropdownId}
              />
            </div>
          )}
        </li>
      </>
    )
  },
)

export default TodoSectionItem
