import { useNavigate } from "react-router-dom"
import TodoSectionList from "../components/common/TodoSectionList"
import { useGetPublicTodoLists } from "../hooks/todoListHooks/useTodoListQueries"
import { FaArrowLeft } from "react-icons/fa6"
import TodoPagesHeader from "../components/common/TodoPagesHeader"

const PublicListsPage = () => {
  const navigate = useNavigate()
  const {
    data: publicLists,
    isLoading: publicLoading,
    isError: publicError,
    hasNextPage: publicHasNextPage,
    fetchNextPage: publicFetchNextPage,
  } = useGetPublicTodoLists()

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
