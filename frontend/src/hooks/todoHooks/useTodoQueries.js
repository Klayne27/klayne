import { useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"

import {
  completeTodoApi,
  createTodoApi,
  deleteTodoApi,
  getCompletedTodosApi,
  getPublicCompletedTodosApi,
  updateTodoApi,
} from "../../api/todoApi"
import { showAppToast } from "../../utils/showAppToast"
import useXpStore from "../../store/useXpStore"
import { calculateXpGainForTodo, findTodoAndParent } from "../../utils/todoUtils"

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

export const useCompleteTodo = () => {
  const queryClient = useQueryClient()
  const { setShowXpGain, setXpGainedAmount } = useXpStore()

  const { mutate: completeTodo } = useMutation({
    mutationFn: completeTodoApi,

    onMutate: async (todoId) => {
      const oldAuthData = queryClient.getQueryData(["authUser"])
      const oldTodoLists = queryClient.getQueryData(["todoLists"])
      const oldPublicTodoLists = queryClient.getQueryData(["publicTodoLists"])

      let found = findTodoAndParent(oldTodoLists, todoId)
      if (!found) {
        found = findTodoAndParent(oldPublicTodoLists, todoId)
      }

      if (found) {
        const { todoToComplete, parentList } = found

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

      const updateCache = (oldData) => {
        const pages = oldData?.pages || []

        return {
          ...oldData,
          pages: pages.map((page) => ({
            ...page,
            data: page.data.map((todoList) => {
              if (todoList._id === found.parentList._id) {
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
      }

      queryClient.setQueryData(["publicTodoLists"], updateCache)
      queryClient.setQueryData(["todoLists"], updateCache)

      return { oldTodoLists, oldAuthData, oldPublicTodoLists }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["todoLists"], context.oldTodoLists)
      queryClient.setQueryData(["authUser"], context.oldAuthData)
      queryClient.setQueryData(["publicTodoLists"], context.oldPublicTodoLists)
      showAppToast(err.message || "Failed to complete todo", "error")
    },
  })

  return { completeTodo }
}

export const useCreateTodo = () => {
  const queryClient = useQueryClient()

  const { mutate: createTodo, isPending: isCreatingTodo } = useMutation({
    mutationFn: createTodoApi,
    onMutate: async (newTodo) => {
      await queryClient.cancelQueries({ queryKey: ["todoLists"] })
      await queryClient.cancelQueries({ queryKey: ["publicTodoLists"] })

      const oldTodoLists = queryClient.getQueryData(["todoLists"])
      const oldPublicTodoLists = queryClient.getQueryData(["publicTodoLists"])

      const tempId = "temp-" + Date.now()
      const optimisticTodo = { ...newTodo, _id: tempId, completed: false }

      const updateCache = (oldData) => {
        const pages = oldData?.pages || []
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
      }

      queryClient.setQueryData(["todoLists"], updateCache)
      queryClient.setQueryData(["publicTodoLists"], updateCache)

      return { oldTodoLists, oldPublicTodoLists }
    },
    onError: (error, newTodo, context) => {
      queryClient.setQueryData(["todoLists"], context.oldTodoLists)
      queryClient.setQueryData(["publicTodoLists"], context.oldPublicTodoLists)

      showAppToast(error.message || "Failed to create todo. Please try again.", "error")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todoLists"] })
      queryClient.invalidateQueries({ queryKey: ["publicTodoLists"] })
    },
  })

  return { createTodo, isCreatingTodo }
}

export const useUpdateTodo = () => {
  const queryClient = useQueryClient()
  const { mutate: updateTodo, isPending: isUpdatingTodo } = useMutation({
    mutationFn: (data) => updateTodoApi(data.id, data.todoData),
    onMutate: async (updatedTodo) => {
      await queryClient.cancelQueries({ queryKey: ["todoLists"] })
      await queryClient.cancelQueries({ queryKey: ["publicTodoLists"] })

      const oldTodoLists = queryClient.getQueryData(["todoLists"])
      const oldPublicTodoLists = queryClient.getQueryData(["publicTodoLists"])

      const updateCache = (oldData) => {
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
      }

      queryClient.setQueryData(["todoLists"], updateCache)
      queryClient.setQueryData(["publicTodoLists"], updateCache)

      return { oldTodoLists, oldPublicTodoLists }
    },
    onError: (error, updatedTodo, context) => {
      queryClient.setQueryData(["todoLists"], context.oldTodoLists)
      queryClient.setQueryData(["publicTodoLists"], context.oldPublicTodoLists)

      showAppToast(error.message || "Failed to update todo. Please try again.", "error")
    },
  })

  return { updateTodo, isUpdatingTodo }
}

export const useDeleteTodo = () => {
  const queryClient = useQueryClient()
  const { mutate: deleteTodo, isPending: isDeletingTodo } = useMutation({
    mutationFn: deleteTodoApi,
    onMutate: async (todoIdToDelete) => {
      await queryClient.cancelQueries({ queryKey: ["todoLists"] })
      await queryClient.cancelQueries({ queryKey: ["publicTodoLists"] })

      const oldTodoLists = queryClient.getQueryData(["todoLists"])
      const oldPublicTodoLists = queryClient.getQueryData(["publicTodoLists"])

      const updateCache = (oldData) => {
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
      }

      queryClient.setQueryData(["todoLists"], updateCache)
      queryClient.setQueryData(["publicTodoLists"], updateCache)

      return { oldTodoLists, oldPublicTodoLists }
    },
    onError: (error, todoIdToDelete, context) => {
      queryClient.setQueryData(["todoLists"], context.oldTodoLists)
      queryClient.setQueryData(["publicTodoLists"], context.oldPublicTodoLists)

      showAppToast(error.message || "Failed to delete todo. Please try again.", "error")
    },
  })

  return { deleteTodo, isDeletingTodo }
}
