import { useTodoStore } from "../store/useTodoStore"
import { useGetUserTodoLists } from "../features/todos/todoListHooks/useGetUserTodoLists"
import CreateTodoListModal from "../features/todos/CreateTodoListModal"
import TodoSectionList from "../features/todos/TodoSectionList"
import TodoPagesHeader from "../features/todos/TodoPagesHeader"

const MyTodoListsPage = () => {
  const { showCreateTodoListModal, setShowCreateTodoListModal } = useTodoStore()

  const { myTodoLists, myListsLoading, myListsError, myListsHasNextPage, myListsFetchNextPage } =
    useGetUserTodoLists()

  return (
    <>
      <TodoPagesHeader pageTitle={"My Lists"} />

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
