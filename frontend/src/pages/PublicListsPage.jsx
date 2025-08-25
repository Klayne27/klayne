import TodoSectionList from "../features/todos/TodoSectionList"
import { useGetPublicTodoLists } from "../features/todos/todoListHooks/useGetPublicTodoLists"
import TodoPagesHeader from "../features/todos/TodoPagesHeader"

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
