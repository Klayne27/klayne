import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { getPublicCompletedTodosApi } from "../../../api/todoApi"
import { todoKeys } from "./todoKeys"
import { useEffect } from "react"

export const useGetPublicCompletedTodos = () => {
  const queryClient = useQueryClient()
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

  useEffect(() => {
    return () => {
      queryClient.removeQueries({ queryKey: todoKeys.list("public") })
    }
  }, [queryClient])

  return {
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    publicCompletedTodos,
    isLoadingPublicCompletedTodos,
    publicCompletedTodosError,
  }
}
