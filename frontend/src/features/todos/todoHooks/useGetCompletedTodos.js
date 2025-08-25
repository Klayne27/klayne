import { useInfiniteQuery } from "@tanstack/react-query"
import { getCompletedTodosApi } from "../../../api/todoApi"
import { todoKeys } from "./todoKeys"

export const useGetCompletedTodos = () => {
  const {
    data: completedTodos,
    isLoading: completedLoading,
    isError: completedError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: todoKeys.completed("user"),
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
