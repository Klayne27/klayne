import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import toast from "react-hot-toast"
import {
  completeTodoApi,
  createTodoApi,
  deleteTodoApi,
  getCompletedTodosApi,
  getFollowingTodosApi,
  getPublicTodosApi,
  getUserTodosApi,
  updateTodoApi,
} from "../../api/todoApi"

export const useCreateTodo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createTodoApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] })
      queryClient.invalidateQueries({ queryKey: ["todoLists"] })
      queryClient.invalidateQueries({ queryKey: ["publicTodoLists"] })

      queryClient.invalidateQueries({ queryKey: ["followingTodos"] })
      queryClient.invalidateQueries({ queryKey: ["publicTodos"] })
      toast.success("Todo created successfully!")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

export const useGetUserTodos = () => {
  return useQuery({
    queryKey: ["todos"],
    queryFn: getUserTodosApi,
  })
}

export const useUpdateTodo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => updateTodoApi(data.id, data.todoData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] })
      queryClient.invalidateQueries({ queryKey: ["followingTodos"] })
      queryClient.invalidateQueries({ queryKey: ["publicTodos"] })
      toast.success("Todo updated successfully!")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

export const useGetCompletedTodos = () => {
  return useQuery({
    queryKey: ["completedTodos"],
    queryFn: getCompletedTodosApi,
  })
}

// 2. Modify useCompleteTodo for an optimistic update and better UX
export const useCompleteTodo = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: completeTodoApi,
    // Optimistic Update: Remove the todo from the UI immediately
    onMutate: async (todoId) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["todos"] })
      await queryClient.cancelQueries({ queryKey: ["todoLists"] }) // Invalidate lists as well

      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData(["todos"])
      const previousTodoLists = queryClient.getQueryData(["todoLists"])

      // Optimistically update to the new value
      // This logic assumes your todos are fetched under the "todoLists" query key
      // and nested within each list object.
      queryClient.setQueryData(["todoLists"], (oldData) => {
        if (!oldData) return oldData

        const newPages = oldData.pages.map((page) => ({
          ...page,
          data: page.data.map((list) => ({
            ...list,
            todos: list.todos.filter((todo) => todo._id !== todoId),
          })),
        }))

        return { ...oldData, pages: newPages }
      })

      // Return a context object with the snapshotted value
      return { previousTodos, previousTodoLists }
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, todoId, context) => {
      queryClient.setQueryData(["todoLists"], context.previousTodoLists)
      toast.error(err.message || "Failed to complete todo")
    },
    // Finally, always refetch after the mutation is settled (success or error)
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["todoLists"] })
      queryClient.invalidateQueries({ queryKey: ["completedTodos"] }) // Invalidate the new query
    },
    onSuccess: () => {
      toast.success("Todo completed! ✨")
    },
  })
}

export const useDeleteTodo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteTodoApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] })
      queryClient.invalidateQueries({ queryKey: ["followingTodos"] })
      queryClient.invalidateQueries({ queryKey: ["publicTodos"] })
      toast.success("Todo deleted successfully!")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

export const useGetFollowingTodos = () => {
  return useQuery({
    queryKey: ["followingTodos"],
    queryFn: getFollowingTodosApi,
    retry: false,
  })
}

export const useGetPublicTodos = () => {
  return useQuery({
    queryKey: ["publicTodos"],
    queryFn: getPublicTodosApi,
    retry: false,
  })
}
