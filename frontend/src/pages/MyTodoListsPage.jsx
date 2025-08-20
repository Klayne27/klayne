import { useTodoStore } from "../store/useTodoStore"
import { useGetUserTodoLists } from "../hooks/todoListHooks/useTodoListQueries"
import CreateTodoListModal from "../components/common/CreateTodoListModal"
import TodoSectionList from "../components/common/TodoSectionList"
import TodoPagesHeader from "../components/common/TodoPagesHeader"

import { useState } from "react"

const MyTodoListsPage = () => {
  const {
    showCreateTodoListModal,
    setShowCreateTodoListModal,
  } = useTodoStore()

  const {
    data: myTodoLists,
    isLoading: myListsLoading,
    isError: myListsError,
    hasNextPage: myListsHasNextPage,
    fetchNextPage: myListsFetchNextPage,
  } = useGetUserTodoLists()

  return (
    <>
      <TodoPagesHeader
        pageTitle={"My Lists"}

      />

      <TodoSectionList
        todoLists={myTodoLists}
        isLoading={myListsLoading}
        isError={myListsError}
        hasNextPage={myListsHasNextPage}
        fetchNextPage={myListsFetchNextPage}
      />

      {showCreateTodoListModal && (
        <CreateTodoListModal onClose={() => setShowCreateTodoListModal(false)} />
      )}
    </>
  )
}

export default MyTodoListsPage
