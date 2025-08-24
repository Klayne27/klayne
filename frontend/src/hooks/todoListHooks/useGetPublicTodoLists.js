import { useInfiniteQuery } from "@tanstack/react-query"
import { getPublicTodoListsApi } from "../../api/todoListApi"
import { todoKeys } from "../todoHooks/todoKeys"

export const useGetPublicTodoLists = () => {
  const {
    data: publicLists,
    isLoading: publicLoading,
    isError: publicError,
    hasNextPage: publicHasNextPage,
    fetchNextPage: publicFetchNextPage,
  } = useInfiniteQuery({
    queryKey: todoKeys.list("public"),
    queryFn: getPublicTodoListsApi,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasNextPage) {
        return lastPage.currentPage + 1
      }
      return undefined
    },
    initialPageParam: 0,
  })

  return { publicLists, publicLoading, publicError, publicHasNextPage, publicFetchNextPage }
}
