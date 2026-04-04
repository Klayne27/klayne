import TodoSectionList from "../../features/todos/components/TodoSectionList"
import TodoPagesHeader from "../../features/todos/components/TodoPagesHeader"
import { useGetFollowingTodoLists } from "../../features/todos/todoListHooks/useTodoListQueries"

const FollowingListsPage = () => {
  const {
   followingLists,
    followingLoading,
    followingError,
    followingHasNextPage,
    followingFetchNextPage,
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
