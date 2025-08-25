import { useInfiniteQuery } from "@tanstack/react-query"
import { getPublicCompletedTodosApi } from "../../../api/todoApi"
import { todoKeys } from "./todoKeys"

export const useGetPublicCompletedTodos = () => {
  const {
    data: publicCompletedTodos,
    isLoading: isLoadingPublicCompletedTodos,
    isError: publicCompletedTodosError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: todoKeys.list("public"),
    queryFn: getPublicCompletedTodosApi,
    getNextPageParam: (lastPage, allPages) => {
      const hasNextPage = lastPage.hasNextPage
      if (hasNextPage) {
        return allPages.length
      }
      return undefined
    },
  })
  return {
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    publicCompletedTodos,
    isLoadingPublicCompletedTodos,
    publicCompletedTodosError,
  }
}
