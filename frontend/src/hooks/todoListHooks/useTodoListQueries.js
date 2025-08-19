import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"

import toast from "react-hot-toast"
import {
  createTodoListApi,
  deleteTodoListApi,
  getFollowingTodoListsApi,
  getPublicTodoListsApi,
  getTodoListByIdApi,
  getTodosInListApi,
  getUserTodoListsApi,
  updateTodoListApi,
} from "../../api/todoListApi"
import { showAppToast } from "../../utils/showAppToast"

export const useGetTodoListById = (listId) => {
  return useQuery({
    queryKey: ["todoList", listId],
    queryFn: () => getTodoListByIdApi(listId),
    enabled: !!listId,
  })
}

export const useGetTodosInList = (listId) => {
  return useQuery({
    queryKey: ["todosInList", listId],
    queryFn: () => getTodosInListApi(listId),
    enabled: !!listId,
  })
}

export const useGetUserTodoLists = () => {
  return useInfiniteQuery({
    queryKey: ["todoLists"],
    queryFn: getUserTodoListsApi,
    getNextPageParam: (lastPage) => {
      // Check if the backend response has a next page
      // If it does, return the current page plus one
      if (lastPage.hasNextPage) {
        return lastPage.currentPage + 1
      }
      // Otherwise, return undefined to signal no more pages
      return undefined
    },
    initialPageParam: 1, // Start with the first page
  })
}

export const useGetFollowingTodoLists = () => {
  return useInfiniteQuery({
    queryKey: ["followingTodoLists"],
    queryFn: getFollowingTodoListsApi,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasNextPage) {
        return lastPage.currentPage + 1
      }
      return undefined
    },
    initialPageParam: 1,
    retry: false,
  })
}

export const useGetPublicTodoLists = () => {
  return useInfiniteQuery({
    queryKey: ["publicTodoLists"],
    queryFn: getPublicTodoListsApi,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasNextPage) {
        return lastPage.currentPage + 1
      }
      return undefined
    },
    initialPageParam: 1,
    retry: false,
  })
}

const TODO_LISTS_QUERY_KEY = ["todoLists"]

export const useCreateTodoList = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTodoListApi,
    // The onMutate function is called before the mutation function
    onMutate: async (newTodoList) => {
      // 1. Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: TODO_LISTS_QUERY_KEY })

      // 2. Snapshot the previous value
      const previousTodoLists = queryClient.getQueryData(TODO_LISTS_QUERY_KEY)

      // 3. Optimistically update to the new value
      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, (old) => [
        ...(old || []),
        // Add a temporary ID and default values for instant UI feedback
        { ...newTodoList, _id: `temp-${Date.now()}`, todos: [] },
      ])

      // 4. Return a context object with the snapshotted value
      return { previousTodoLists }
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, newTodoList, context) => {
      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, context.previousTodoLists)
      showAppToast(err.message, "error")
    },
    // Always refetch after error or success to ensure server state
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TODO_LISTS_QUERY_KEY })
    },
    onSuccess: () => {
      showAppToast("Todo section created!", "success")
    },
  })
}

export const useUpdateTodoList = () => {
  const queryClient = useQueryClient()

  const { mutate: updateTodoList, isPending: isUpdatingTodoList } = useMutation({
    mutationFn: (data) => updateTodoListApi(data.id, data.listData),
    onMutate: async ({ id, listData }) => {
      await queryClient.cancelQueries({ queryKey: TODO_LISTS_QUERY_KEY })
      const previousTodoLists = queryClient.getQueryData(TODO_LISTS_QUERY_KEY)

      // Find the specific list and update it in the cache
      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, (old) =>
        old.map((list) => (list._id === id ? { ...list, ...listData } : list)),
      )

      return { previousTodoLists }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, context.previousTodoLists)
      showAppToast(err.message, "error")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TODO_LISTS_QUERY_KEY })
    },
    onSuccess: () => {
      showAppToast("Todo section updated!", "success")
    },
  })

  return { updateTodoList, isUpdatingTodoList }
}

export const useDeleteTodoList = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTodoListApi,
    onMutate: async (listId) => {
      await queryClient.cancelQueries({ queryKey: TODO_LISTS_QUERY_KEY })
      const previousTodoLists = queryClient.getQueryData(TODO_LISTS_QUERY_KEY)

      // Filter out the deleted list from the cache
      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, (old) =>
        old.filter((list) => list._id !== listId),
      )

      return { previousTodoLists }
    },
    onError: (err, listId, context) => {
      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, context.previousTodoLists)
      showAppToast(err.message, "error")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TODO_LISTS_QUERY_KEY })
    },
    onSuccess: () => {
      showAppToast("Todo section deleted!", "success")
    },
  })
}