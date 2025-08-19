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
    onMutate: async (newTodoList) => {
      await queryClient.cancelQueries({ queryKey: TODO_LISTS_QUERY_KEY })
      const previousTodoLists = queryClient.getQueryData(TODO_LISTS_QUERY_KEY)

      // Optimistically update the INFINITE query cache
      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, (oldData) => {
        // If there's no old data, return it.
        if (!oldData || !oldData.pages) {
          return oldData
        }

        // Create a new pages array with the new todo list added to the FIRST page
        const newPages = oldData.pages.map((page, index) => {
          if (index === 0) {
            // IMPORTANT: Your API response for a page might put the array in a property like 'data', 'docs', 'lists', etc.
            // Adjust `page.data` to match your actual API response structure.
            // If the page itself is the array, you would use `[newItem, ...page]`.
            return {
              ...page,
              data: [{ ...newTodoList, _id: `temp-${Date.now()}`, todos: [] }, ...page.data],
            }
          }
          return page
        })

        return { ...oldData, pages: newPages }
      })

      return { previousTodoLists }
    },
    onError: (err, newTodoList, context) => {
      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, context.previousTodoLists)
      showAppToast(err.message, "error")
    },
    onSettled: () => {
      // Refetch to get the real data from the server
      queryClient.invalidateQueries({ queryKey: TODO_LISTS_QUERY_KEY })
    },
    onSuccess: () => {
      showAppToast("Todo section created!", "success")
    },
  })
}

// ----------------------------------------------------

export const useUpdateTodoList = () => {
  const queryClient = useQueryClient()

  const { mutate: updateTodoList, isPending: isUpdatingTodoList } = useMutation({
    mutationFn: (data) => updateTodoListApi(data.id, data.listData),
    onMutate: async ({ id, listData }) => {
      await queryClient.cancelQueries({ queryKey: TODO_LISTS_QUERY_KEY })
      const previousTodoLists = queryClient.getQueryData(TODO_LISTS_QUERY_KEY)

      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, (oldData) => {
        if (!oldData) return oldData

        const newPages = oldData.pages.map((page) => ({
          ...page,
          // Again, ensure `page.data` matches your API response structure
          data: page.data.map((list) => (list._id === id ? { ...list, ...listData } : list)),
        }))

        return { ...oldData, pages: newPages }
      })

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

// ----------------------------------------------------

export const useDeleteTodoList = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTodoListApi,
    onMutate: async (listId) => {
      await queryClient.cancelQueries({ queryKey: TODO_LISTS_QUERY_KEY })
      const previousTodoLists = queryClient.getQueryData(TODO_LISTS_QUERY_KEY)

      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, (oldData) => {
        if (!oldData) return oldData

        const newPages = oldData.pages.map((page) => ({
          ...page,
          // Again, ensure `page.data` matches your API response structure
          data: page.data.filter((list) => list._id !== listId),
        }))

        return { ...oldData, pages: newPages }
      })

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