import TodoListList from "../components/common/TodoListList"
import { useGetFollowingTodoLists } from "../hooks/todoListHooks/useTodoListQueries"
import TodoPagesHeader from "../components/common/TodoPagesHeader"

const FollowingListsPage = () => {
  const {
    data: followingLists,
    isLoading: followingLoading,
    isError: followingError,
    hasNextPage: followingHasNextPage,
    fetchNextPage: followingFetchNextPage,
  } = useGetFollowingTodoLists()

  return (
    <>
      <TodoPagesHeader pageTitle={"Following Lists"} />

      <TodoListList
        todoLists={followingLists}
        isLoading={followingLoading}
        isError={followingError}
        hasNextPage={followingHasNextPage}
        fetchNextPage={followingFetchNextPage}
      />
    </>
  )
}

export default FollowingListsPage
