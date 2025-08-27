import { useTodoStore } from "../../store/useTodoStore"
import { useGetUserTodoLists } from "../../features/todos/todoListHooks/useGetUserTodoLists"
import CreateTodoListModal from "../../features/todos/CreateTodoListModal"
import TodoSectionList from "../../features/todos/TodoSectionList"
import TodoPagesHeader from "../../features/todos/TodoPagesHeader"
import useLockBodyScroll from "../../hooks/customHooks/useLockBodyScroll"

const MyTodoListsPage = () => {
  const { showCreateTodoListModal, setShowCreateTodoListModal } = useTodoStore()

  const { myTodoLists, myListsLoading, myListsError, myListsHasNextPage, myListsFetchNextPage } =
    useGetUserTodoLists()

  const isAddTodoMenuOpen = useTodoStore((state) => state.isAddTodoMenuOpen)
  const isEditTodoMenuOpen = useTodoStore((state) => state.isEditTodoMenuOpen)
  const isMenuOpen = isAddTodoMenuOpen || isEditTodoMenuOpen

  useLockBodyScroll(isMenuOpen)

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
