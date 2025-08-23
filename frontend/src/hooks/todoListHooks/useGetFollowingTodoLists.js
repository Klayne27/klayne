import { useInfiniteQuery } from "@tanstack/react-query"
import { getFollowingTodoListsApi } from "../../api/todoListApi"
import { FOLLOWING_TODO_LISTS_QUERY_KEY } from "../../constants/queryKeys"

export const useGetFollowingTodoLists = () => {
  const {
    data: followingLists,
    isLoading: followingLoading,
    isError: followingError,
    hasNextPage: followingHasNextPage,
    fetchNextPage: followingFetchNextPage,
  } = useInfiniteQuery({
    queryKey: FOLLOWING_TODO_LISTS_QUERY_KEY,
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
