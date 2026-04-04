import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { getActiveTodosCountApi, getCompletedTodosApi, getCompletedTodosCountApi, getCompletedTodosWithDatesApi, getPublicCompletedTodosApi, getTodoActivityApi } from "../../../api/todoApi"
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

export const useGetTodoActivities = () => {
  const {
    data: todoActivities,
    isLoading: todoActivitiesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: todoKeys.activityLog(),
    queryFn: getTodoActivityApi,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasNextPage) {
        return allPages.length
      }
      return undefined
    },
  })
  return { todoActivities, todoActivitiesLoading, fetchNextPage, hasNextPage, isFetchingNextPage }
}

export const useGetPublicCompletedTodos = () => {
  const {
    data: publicCompletedTodos,
    isLoading: isLoadingPublicCompletedTodos,
    isError: publicCompletedTodosError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: todoKeys.completed("public"),
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

export const useGetActiveTodosCount = () => {
  const { data: activeTodosCount, isLoading: loadingActiveTodosCount } = useQuery({
    queryKey: todoKeys.activeCount(),
    queryFn: getActiveTodosCountApi,
  })

  return { activeTodosCount, loadingActiveTodosCount }
}

export const useGetCompletedTodosCount = () => {
  const { data: completedTodosCount, isLoading: loadingCompletedTodosCount } = useQuery({
    queryKey: todoKeys.completedCount(),
    queryFn: getCompletedTodosCountApi,
  })
  return { completedTodosCount, loadingCompletedTodosCount }
}

export const useGetCompletedTodosWithDates = () => {
  const { data: completedTodos, isLoading: completedTodosLoading } = useQuery({
    queryKey: ["completedTodosWithDates"],
    queryFn: getCompletedTodosWithDatesApi,
  })

  return { completedTodos, completedTodosLoading }
}


