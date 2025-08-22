import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"

import {
  completeTodoApi,
  createTodoApi,
  deleteTodoApi,
  getCompletedTodosApi,
  getFollowingTodosApi,
  getPublicCompletedTodosApi,
  getPublicTodosApi,
  getUserTodosApi,
  updateTodoApi,
} from "../../api/todoApi"
import { showAppToast } from "../../utils/showAppToast"
import { useAuthUser } from "../authHooks/useAuthUser"
import useXpStore from "../../store/useXpStore"

export const useGetCompletedTodos = () => {
  const {
    data: completedTodos,
    isLoading: completedLoading,
    isError: completedError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["completedTodos"],
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

export const useGetPublicCompletedTodos = () => {
  const {
    data: publicCompletedTodos,
    isLoading: isLoadingPublicCompletedTodos,
    isError: publicCompletedTodosError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["publicCompletedTodos"],
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

const calculateXpGainForTodo = (todo, todoList) => {
  const xpRewards = {
    low: 25,
    medium: 50,
    high: 100,
    urgent: 200,
  }

  let xpToAdd = xpRewards[todo.priority] || 25

  if (todoList && todoList.isPublic) {
    xpToAdd *= 2
  }

  return xpToAdd
}

export const useCompleteTodo = () => {
  const queryClient = useQueryClient()
  const { setShowXpGain, setXpGainedAmount } = useXpStore()

  const { mutate: completeTodo } = useMutation({
    mutationFn: completeTodoApi,

    // This callback is the most critical part of the solution
    onMutate: async (todoId) => {
      // 1. Optimistically update the authUser XP
      const oldAuthData = queryClient.getQueryData(["authUser"])
      const oldTodoLists = queryClient.getQueryData(["todoLists"])

      let todoToComplete = null
      let parentList = null

      oldTodoLists?.pages?.forEach((page) => {
        page.data.forEach((todoList) => {
          const todo = todoList.todos.find((t) => t._id === todoId)
          if (todo) {
            todoToComplete = todo
            parentList = todoList
          }
        })
      })


      if (todoToComplete && parentList) {
        const optimisticXpGain = calculateXpGainForTodo(todoToComplete, parentList)
        setXpGainedAmount(optimisticXpGain)
        setShowXpGain(true)
        setTimeout(() => setShowXpGain(false), 2000)

        queryClient.setQueryData(["authUser"], (oldData) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            pomodoroXP: oldData.pomodoroXP + optimisticXpGain,
          }
        })
      }

      // 2. Optimistically update the todoLists cache to remove the item
      //    and update the count. This is what makes the UI feel fast.

      queryClient.setQueryData(["todoLists"], (oldData) => {
        if (!oldData) return { pages: [] }
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            data: page.data.map((todoList) => {
              if (todoList._id === parentList._id) {
                return {
                  ...todoList,
                  todos: todoList.todos.filter((todo) => todo._id !== todoId),
                  totalTodos: todoList.totalTodos - 1,
                }
              }
              return todoList
            }),
          })),
        }
      })

      // 3. Return a context object to be used in onSuccess and onError
      return { oldTodoLists, oldAuthData }
    },

    onSuccess: (data) => {
      // Now, invalidate the queries to trigger a refetch and remove the item from the list.
      // queryClient.invalidateQueries({ queryKey: ["todoLists"] })
      queryClient.invalidateQueries({ queryKey: ["completedTodos"] })
      queryClient.invalidateQueries({ queryKey: ["todoActivityLog"] })
    },
    onError: (err, variables, context) => {
      showAppToast(err.message || "Failed to complete todo", "error")
      queryClient.setQueryData(["todoLists"], context.oldTodoLists)
      queryClient.setQueryData(["authUser"], context.oldAuthData)
    },
  })

  return { completeTodo }
}

export const useCreateTodo = () => {
  const queryClient = useQueryClient()

  const { mutate: createTodo, isPending: isCreatingTodo } = useMutation({
    mutationFn: createTodoApi,
    onMutate: async (newTodo) => {
      // Cancel any outgoing queries to prevent them from overwriting our optimistic update
      // await queryClient.cancelQueries({ queryKey: ["todos"] })
      await queryClient.cancelQueries({ queryKey: ["todoLists"] })

      // Safely get the previous data and provide a default empty object/array
      // const previousTodos = queryClient.getQueryData(["todos"])
      const previousTodoLists = queryClient.getQueryData(["todoLists"])

      const tempId = "temp-" + Date.now()
      const optimisticTodo = { ...newTodo, _id: tempId, completed: false }

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
      return { previousTodoLists }
    },
    onError: (error, newTodo, context) => {
      // Rollback the cache to the previous data
      // if (context?.previousTodos) {
      //   queryClient.setQueryData(["todos"], context.previousTodos)
      // }
      if (context?.previousTodoLists) {
        queryClient.setQueryData(["todoLists"], context.previousTodoLists)
      }
      showAppToast(error.message || "Failed to create todo. Please try again.", "error")
    },
    onSettled: () => {
      // Invalidate all relevant queries to refetch fresh data
      // queryClient.invalidateQueries({ queryKey: ["todos"] })
      queryClient.invalidateQueries({ queryKey: ["todoLists"] })
      queryClient.invalidateQueries({ queryKey: ["publicTodoLists"] })
    },
    // onSuccess: () => {
    //   showAppToast("Todo created successfully!", "success")
    // },
  })

  return { createTodo, isCreatingTodo }
}

export const useUpdateTodo = () => {
  const queryClient = useQueryClient()
  const { mutate: updateTodo, isPending: isUpdatingTodo } = useMutation({
    mutationFn: (data) => updateTodoApi(data.id, data.todoData),
    onMutate: async (updatedTodo) => {
      // Cancel any outgoing queries to prevent them from overwriting our optimistic update.
      await queryClient.cancelQueries({ queryKey: ["todos"] })
      await queryClient.cancelQueries({ queryKey: ["todoLists"] })

      const previousTodos = queryClient.getQueryData(["todos"])
      const previousTodoLists = queryClient.getQueryData(["todoLists"])
      // Update the main 'todos' query

      queryClient.setQueryData(["todos"], (oldData) => {
        const pages = oldData?.pages || []
        return {
          ...oldData,
          pages: pages.map((page) => ({
            ...page,
            data: page.data.map((todo) =>
              todo._id === updatedTodo.id ? { ...todo, ...updatedTodo.todoData } : todo,
            ),
          })),
        }
      }) // Update the 'todoLists' query

      queryClient.setQueryData(["todoLists"], (oldData) => {
        const pages = oldData?.pages || []
        return {
          ...oldData,
          pages: pages.map((page) => ({
            ...page,
            data: page.data.map((todoList) => ({
              ...todoList,
              todos: todoList.todos.map((todo) =>
                todo._id === updatedTodo.id ? { ...todo, ...updatedTodo.todoData } : todo,
              ),
            })),
          })),
        }
      }) // Update the 'completedTodos' query if it exists

      return { previousTodos, previousTodoLists }
    },
    onError: (error, updatedTodo, context) => {
      // If the mutation fails, roll back the cache to the previous state.
      if (context?.previousTodos) {
        queryClient.setQueryData(["todos"], context.previousTodos)
      }
      if (context?.previousTodoLists) {
        queryClient.setQueryData(["todoLists"], context.previousTodoLists)
      }

      showAppToast(error.message || "Failed to update todo. Please try again.", "error")
    },
    onSettled: () => {
      // After the mutation is complete, invalidate all relevant queries
      // to ensure the cache is synchronized with the server.
      // queryClient.invalidateQueries({ queryKey: ["todos"] })
      // queryClient.invalidateQueries({ queryKey: ["todoLists"] })
    },
    // onSuccess: () => {
    //   showAppToast("Todo updated successfully!", "success")
    // },
  })

  return { updateTodo, isUpdatingTodo }
}

export const useDeleteTodo = () => {
  const queryClient = useQueryClient()
  const { mutate: deleteTodo, isPending: isDeletingTodo } = useMutation({
    mutationFn: deleteTodoApi,
    onMutate: async (todoIdToDelete) => {
      // Cancel any outgoing queries to prevent them from overwriting our optimistic update.
      await queryClient.cancelQueries({ queryKey: ["todos"] })
      await queryClient.cancelQueries({ queryKey: ["todoLists"] })

      // Snapshot the current cache.
      const previousTodos = queryClient.getQueryData(["todos"])
      const previousTodoLists = queryClient.getQueryData(["todoLists"])

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

      // Return a context object with the snapshots for potential rollback.
      return { previousTodos, previousTodoLists }
    },
    onError: (error, todoIdToDelete, context) => {
      // If the mutation fails, roll back the cache to the previous state.
      if (context?.previousTodos) {
        queryClient.setQueryData(["todos"], context.previousTodos)
      }
      if (context?.previousTodoLists) {
        queryClient.setQueryData(["todoLists"], context.previousTodoLists)
      }
      showAppToast(error.message || "Failed to delete todo. Please try again.", "error")
    },
    onSettled: () => {
      // After the mutation is complete, invalidate all relevant queries
      // to ensure the cache is synchronized with the server.
      // queryClient.invalidateQueries({ queryKey: ["todos"] })
      // queryClient.invalidateQueries({ queryKey: ["todoLists"] })
      // showAppToast("Todo deleted successfully!", "success")
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
