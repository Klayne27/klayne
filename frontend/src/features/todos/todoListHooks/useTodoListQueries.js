import { useInfiniteQuery } from "@tanstack/react-query"
import { getFollowingTodoListsApi, getPublicTodoListsApi, getUserTodoListsApi } from "../../../api/todoListApi"
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


