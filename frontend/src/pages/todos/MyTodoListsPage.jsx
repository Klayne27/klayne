import { useTodoStore } from "../../store/useTodoStore"
import CreateTodoListModal from "../../features/todos/components/CreateTodoListModal"
import TodoSectionList from "../../features/todos/components/TodoSectionList"
import TodoPagesHeader from "../../features/todos/components/TodoPagesHeader"
import { useGetUserTodoLists } from "../../features/todos/todoListHooks/useTodoListQueries"

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
