import TodoSectionList from "../components/common/TodoSectionList"
import { useGetPublicTodoLists } from "../hooks/todoListHooks/useTodoListQueries"
import TodoPagesHeader from "../components/common/TodoPagesHeader"

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
