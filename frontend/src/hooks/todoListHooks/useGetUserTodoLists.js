import { useInfiniteQuery } from "@tanstack/react-query"
import { getUserTodoListsApi } from "../../api/todoListApi"
import { todoKeys } from "../todoHooks/todoKeys"

export const useGetUserTodoLists = () => {
  const {
    data: myTodoLists,
    isLoading: myListsLoading,
    isError: myListsError,
    hasNextPage: myListsHasNextPage,
    fetchNextPage: myListsFetchNextPage,
  } = useInfiniteQuery({
    queryKey: todoKeys.list("user"),
    queryFn: getUserTodoListsApi,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasNextPage) {
        return lastPage.currentPage + 1
      }
      return undefined
    },
    initialPageParam: 0,
  })

  return { myTodoLists, myListsLoading, myListsError, myListsHasNextPage, myListsFetchNextPage }
}
