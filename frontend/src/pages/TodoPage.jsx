import React from "react"
import { FaPlus } from "react-icons/fa6"
import { useTodoStore } from "../store/useTodoStore"
import CreateTodoModal from "../components/common/CreateTodoModal"
import TodoListList from "../components/common/TodoListList"
import CreateTodoListModal from "../components/common/CreateTodoListModal"
import {
  useGetUserTodoLists,
  useGetFollowingTodoLists,
  useGetPublicTodoLists,
} from "../hooks/todoListHooks/useTodoListQueries"
import { FaArrowLeft, FaListUl, FaUserGroup, FaGlobe } from "react-icons/fa6"
import { useNavigate } from "react-router-dom"
import { useGetCompletedTodos } from "../hooks/todoHooks/useTodoQueries"
import { FaCheckSquare } from "react-icons/fa"
import CompletedTodoList from "../components/common/CompletedTodoList"

const TodoPage = () => {
  const { activeTab, setActiveTab, showCreateTodoListModal, setShowCreateTodoListModal } =
    useTodoStore()

  const navigate = useNavigate()

  const {
    data: myTodoLists,
    isLoading: myListsLoading,
    isError: myListsError,
    hasNextPage: myListsHasNextPage,
    fetchNextPage: myListsFetchNextPage,
  } = useGetUserTodoLists()

  const {
    data: followingLists,
    isLoading: followingLoading,
    isError: followingError,
    hasNextPage: followingHasNextPage,
    fetchNextPage: followingFetchNextPage,
  } = useGetFollowingTodoLists()

  const {
    data: publicLists,
    isLoading: publicLoading,
    isError: publicError,
    hasNextPage: publicHasNextPage,
    fetchNextPage: publicFetchNextPage,
  } = useGetPublicTodoLists()

  const {
    data: completedTodos,
    isLoading: completedLoading,
    isError: completedError,
  } = useGetCompletedTodos()

  const getActiveLists = () => {
    switch (activeTab) {
      case "myLists":
        return {
          isList: true,
          lists: myTodoLists,
          isLoading: myListsLoading,
          isError: myListsError,
          hasNextPage: myListsHasNextPage,
          fetchNextPage: myListsFetchNextPage,
        }
      case "followingLists":
        return {
          isList: true,
          lists: followingLists,
          isLoading: followingLoading,
          isError: followingError,
          hasNextPage: followingHasNextPage,
          fetchNextPage: followingFetchNextPage,
        }
      case "publicLists":
        return {
          isList: true,
          lists: publicLists,
          isLoading: publicLoading,
          isError: publicError,
          hasNextPage: publicHasNextPage,
          fetchNextPage: publicFetchNextPage,
        }
      case "completedTodos":
        return {
          isList: false,
          data: completedTodos,
          isLoading: completedLoading,
          isError: completedError,
        }
      default:
        return {
          isList: true,
          lists: { pages: [], pageParams: [] },
          isLoading: false,
          isError: false,
          hasNextPage: false,
          fetchNextPage: () => {},
        }
    }
  }
  const { isList, lists, isLoading, isError, hasNextPage, fetchNextPage, data } = getActiveLists()

  const navItems = [
    {
      tab: "myLists",
      label: "My Lists",
      icon: <FaListUl className="size-5" />,
    },
    {
      tab: "followingLists",
      label: "Following",
      icon: <FaUserGroup className="size-5" />,
    },
    {
      tab: "publicLists",
      label: "Public",
      icon: <FaGlobe className="size-5" />,
    },
    {
      tab: "completedTodos",
      label: "Completed",
      icon: <FaCheckSquare className="size-5" />,
    },
  ]

  return (
    <div className="relative flex h-screen min-h-screen flex-col bg-base-100">
      {/* Header */}
      <div className="flex flex-none items-center gap-4 px-4 py-1">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-gray-200">
          <FaArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold">Todos</h1>
      </div>
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-y-auto pb-36 md:pb-4">
        {isList ? (
          <TodoListList
            todoLists={lists}
            isLoading={isLoading}
            isError={isError}
            hasNextPage={hasNextPage}
            fetchNextPage={fetchNextPage}
          />
        ) : (
          <CompletedTodoList todos={data} isLoading={isLoading} isError={isError} />
        )}
      </div>
      {/* Floating "Create List" button */}
      <button
        onClick={() => setShowCreateTodoListModal(true)}
        className="white-shadow fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg transition-transform duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <FaPlus className="h-6 w-6" />
      </button>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 flex-none items-center justify-around border-t bg-base-100 p-2 shadow-inner md:hidden">
        {navItems.map((item) => (
          <button
            key={item.tab}
            onClick={() => setActiveTab(item.tab)}
            className={`flex flex-1 flex-col items-center gap-1 rounded-lg p-2 ${
              activeTab === item.tab ? "text-primary" : "text-gray-500"
            }`}
          >
            {item.icon} <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </nav>

      {showCreateTodoListModal && (
        <CreateTodoListModal onClose={() => setShowCreateTodoListModal(false)} />
      )}
      <CreateTodoModal />
    </div>
  )
}

export default TodoPage
