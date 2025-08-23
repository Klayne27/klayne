import { useInfiniteQuery } from "@tanstack/react-query"
import { COMPLETED_TODOS_QUERY_KEY } from "../../constants/queryKeys"
import { getCompletedTodosApi } from "../../api/todoApi"

export const useGetCompletedTodos = () => {
  const {
    data: completedTodos,
    isLoading: completedLoading,
    isError: completedError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: COMPLETED_TODOS_QUERY_KEY,
    queryFn: getCompletedTodosApi,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasNextPage) {
        return allPages.length
      }
      return undefined
    },
  })

  return {
    completedTodos,
    completedLoading,
    completedError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  }
}
