import TodoSectionList from "../components/common/TodoSectionList"
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

      <TodoSectionList
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
