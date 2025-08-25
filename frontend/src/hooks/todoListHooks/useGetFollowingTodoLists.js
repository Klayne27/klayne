import { useInfiniteQuery } from "@tanstack/react-query"
import { getFollowingTodoListsApi } from "../../api/todoListApi"
import { todoKeys } from "../../features/todos/todoHooks/todoKeys"

export const useGetFollowingTodoLists = () => {
  const {
    data: followingLists,
    isLoading: followingLoading,
    isError: followingError,
    hasNextPage: followingHasNextPage,
    fetchNextPage: followingFetchNextPage,
  } = useInfiniteQuery({
    queryKey: todoKeys.list("following"),
    queryFn: getFollowingTodoListsApi,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasNextPage) {
        return lastPage.currentPage + 1
      }
      return undefined
    },
    initialPageParam: 0,
  })

  return {
    followingLists,
    followingLoading,
    followingError,
    followingHasNextPage,
    followingFetchNextPage,
  }
}
