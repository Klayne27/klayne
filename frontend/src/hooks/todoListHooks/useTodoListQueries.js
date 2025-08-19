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

export const useCreateTodoList = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createTodoListApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todoLists"] })
      showAppToast("Todo section created!", "success")
    },
    onError: (error) => {
      showAppToast(error.message, "error")
    },
  })
}

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

export const useUpdateTodoList = () => {
  const queryClient = useQueryClient()
  const { mutate: updateTodoList, isPending: isUpdatingTodoList } = useMutation({
    mutationFn: (data) => updateTodoListApi(data.id, data.listData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todoLists"] })
      queryClient.invalidateQueries({ queryKey: ["followingTodoLists"] })
      queryClient.invalidateQueries({ queryKey: ["publicTodoLists"] })
      showAppToast("Todo section updated!", "success")
    },
    onError: (error) => {
      showAppToast(error.message, "error")
    },
  })

  return { updateTodoList, isUpdatingTodoList }
}

export const useDeleteTodoList = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteTodoListApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todoLists"] })
      showAppToast("Todo section deleted!", "success")
    },
    onError: (error) => {
      showAppToast(error.message, "error")
    },
  })
}
