import { useTodoStore } from "../store/useTodoStore"
import { useGetUserTodoLists } from "../hooks/todoListHooks/useTodoListQueries"
import CreateTodoListModal from "../components/common/CreateTodoListModal"
import TodoListList from "../components/common/TodoListList"
import { useNavigate } from "react-router-dom"
import TodoPagesHeader from "../components/common/TodoPagesHeader"

const MyTodoListsPage = () => {
  const { showCreateTodoListModal, setShowCreateTodoListModal } = useTodoStore()
  const {
    data: myTodoLists,
    isLoading: myListsLoading,
    isError: myListsError,
    hasNextPage: myListsHasNextPage,
    fetchNextPage: myListsFetchNextPage,
  } = useGetUserTodoLists()

  return (
    <>
      <TodoPagesHeader pageTitle={"My Lists"} />

      <TodoListList
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
