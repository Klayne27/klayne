import { useInfiniteQuery } from "@tanstack/react-query"
import { getUserTodoListsApi } from "../../api/todoListApi"
import { TODO_LISTS_QUERY_KEY } from "../../constants/queryKeys"

export const useGetUserTodoLists = () => {
  const {
    data: myTodoLists,
    isLoading: myListsLoading,
    isError: myListsError,
    hasNextPage: myListsHasNextPage,
    fetchNextPage: myListsFetchNextPage,
  } = useInfiniteQuery({
    queryKey: TODO_LISTS_QUERY_KEY,
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
