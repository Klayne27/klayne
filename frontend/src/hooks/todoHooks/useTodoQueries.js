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
    onMutate: async (newTodo) => {
      // Cancel any outgoing queries to prevent them from overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["todos"] })
      await queryClient.cancelQueries({ queryKey: ["todoLists"] })

      // Safely get the previous data and provide a default empty object/array
      const previousTodos = queryClient.getQueryData(["todos"])
      const previousTodoLists = queryClient.getQueryData(["todoLists"])

      const tempId = "temp-" + Date.now()
      const optimisticTodo = { ...newTodo, _id: tempId, completed: false }

      // Update the 'todos' query data
      queryClient.setQueryData(["todos"], (oldData) => {
        const pages = oldData?.pages || [] // Safely access pages or default to an empty array
        return {
          ...oldData,
          pages: pages.map((page, index) => {
            if (index === 0) {
              return {
                ...page,
                data: [optimisticTodo, ...page.data],
              }
            }
            return page
          }),
        }
      })

      // Update the 'todoLists' query data
      queryClient.setQueryData(["todoLists"], (oldData) => {
        const pages = oldData?.pages || [] // Safely access pages or default to an empty array
        return {
          ...oldData,
          pages: pages.map((page) => ({
            ...page,
            data: page.data.map((todoList) => {
              if (todoList._id === newTodo.todoListId) {
                return {
                  ...todoList,
                  todos: [...todoList.todos, optimisticTodo],
                }
              }
              return todoList
            }),
          })),
        }
      })

      // Return a context object with the snapshot
      return { previousTodos, previousTodoLists }
    },
    onError: (error, newTodo, context) => {
      // Rollback the cache to the previous data
      if (context?.previousTodos) {
        queryClient.setQueryData(["todos"], context.previousTodos)
      }
      if (context?.previousTodoLists) {
        queryClient.setQueryData(["todoLists"], context.previousTodoLists)
      }
      toast.error(error.message || "Failed to create todo. Please try again.")
    },
    onSettled: () => {
      // Invalidate all relevant queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["todos"] })
      queryClient.invalidateQueries({ queryKey: ["todoLists"] })
      queryClient.invalidateQueries({ queryKey: ["publicTodoLists"] })
      queryClient.invalidateQueries({ queryKey: ["followingTodos"] })
      queryClient.invalidateQueries({ queryKey: ["publicTodos"] })
      toast.success("Todo created successfully!")
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
  const { mutate: updateTodo, isPending: isUpdatingTodo } = useMutation({
    mutationFn: (data) => updateTodoApi(data.id, data.todoData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] })
      queryClient.invalidateQueries({ queryKey: ["todoLists"] })
      queryClient.invalidateQueries({ queryKey: ["followingTodos"] })
      queryClient.invalidateQueries({ queryKey: ["publicTodos"] })
      toast.success("Todo updated successfully!")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return { updateTodo, isUpdatingTodo }
}

export const useGetCompletedTodos = () => {
  const {
    data: completedTodos,
    isLoading: completedLoading,
    isError: completedError,
  } = useQuery({
    queryKey: ["completedTodos"],
    queryFn: getCompletedTodosApi,
  })

  return { completedTodos, completedLoading, completedError }
}

// 2. Modify useCompleteTodo for an optimistic update and better UX
export const useCompleteTodo = () => {
  const queryClient = useQueryClient()

  const { mutate: completeTodo, isPending: isCompletingTodo } = useMutation({
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

  return { completeTodo, isCompletingTodo }
}

export const useDeleteTodo = () => {
  const queryClient = useQueryClient()
  const { mutate: deleteTodo, isPending: isDeletingTodo } = useMutation({
    mutationFn: deleteTodoApi,
    onMutate: async (todoIdToDelete) => {
      // Cancel any outgoing queries to prevent them from overwriting our optimistic update.
      await queryClient.cancelQueries({ queryKey: ["todos"] })
      await queryClient.cancelQueries({ queryKey: ["todoLists"] })
      await queryClient.cancelQueries({ queryKey: ["completedTodos"] })

      // Snapshot the current cache.
      const previousTodos = queryClient.getQueryData(["todos"])
      const previousTodoLists = queryClient.getQueryData(["todoLists"])
      const previousCompletedTodos = queryClient.getQueryData(["completedTodos"])

      // Optimistically remove the todo from all relevant caches.
      // Update the main 'todos' query
      queryClient.setQueryData(["todos"], (oldData) => {
        const pages = oldData?.pages || []
        return {
          ...oldData,
          pages: pages.map((page) => ({
            ...page,
            data: page.data.filter((todo) => todo._id !== todoIdToDelete),
          })),
        }
      })

      // Update the 'todoLists' query
      queryClient.setQueryData(["todoLists"], (oldData) => {
        const pages = oldData?.pages || []
        return {
          ...oldData,
          pages: pages.map((page) => ({
            ...page,
            data: page.data.map((todoList) => ({
              ...todoList,
              todos: todoList.todos.filter((todo) => todo._id !== todoIdToDelete),
            })),
          })),
        }
      })

      // Update the 'completedTodos' query if it exists
      if (previousCompletedTodos) {
        queryClient.setQueryData(["completedTodos"], (oldData) =>
          oldData.filter((todo) => todo._id !== todoIdToDelete),
        )
      }

      // Return a context object with the snapshots for potential rollback.
      return { previousTodos, previousTodoLists, previousCompletedTodos }
    },
    onError: (error, todoIdToDelete, context) => {
      // If the mutation fails, roll back the cache to the previous state.
      if (context?.previousTodos) {
        queryClient.setQueryData(["todos"], context.previousTodos)
      }
      if (context?.previousTodoLists) {
        queryClient.setQueryData(["todoLists"], context.previousTodoLists)
      }
      if (context?.previousCompletedTodos) {
        queryClient.setQueryData(["completedTodos"], context.previousCompletedTodos)
      }
      toast.error(error.message || "Failed to delete todo. Please try again.")
    },
    onSettled: () => {
      // After the mutation is complete, invalidate all relevant queries
      // to ensure the cache is synchronized with the server.
      queryClient.invalidateQueries({ queryKey: ["todos"] })
      queryClient.invalidateQueries({ queryKey: ["todoLists"] })
      queryClient.invalidateQueries({ queryKey: ["publicTodoLists"] })
      queryClient.invalidateQueries({ queryKey: ["followingTodos"] })
      queryClient.invalidateQueries({ queryKey: ["publicTodos"] })
      queryClient.invalidateQueries({ queryKey: ["completedTodos"] })
      toast.success("Todo deleted successfully!")
    },
  })

  return { deleteTodo, isDeletingTodo }
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
