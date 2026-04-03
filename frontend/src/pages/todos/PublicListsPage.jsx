import TodoSectionList from "../../features/todos/TodoSectionList"
import TodoPagesHeader from "../../features/todos/TodoPagesHeader"
import { useGetPublicTodoLists } from "../../features/todos/todoListHooks/useTodoListQueries"

const PublicListsPage = () => {
  const { publicLists, publicLoading, publicError, publicHasNextPage, publicFetchNextPage } =
    useGetPublicTodoLists()

  return (
    <>
      <TodoPagesHeader pageTitle={"Public Lists"} />

      <TodoSectionList
        todoLists={publicLists}
        isLoading={publicLoading}
        isError={publicError}
        hasNextPage={publicHasNextPage}
        fetchNextPage={publicFetchNextPage}
      />
    </>
  )
}

export default PublicListsPage
