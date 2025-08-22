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
import { calculateXpGainForTodo } from "../../utils/todoUtils"

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

      oldPublicTodoLists?.pages?.forEach((page) => {
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

      queryClient.setQueryData(["publicTodoLists"], (oldData) => {
        if (!oldData) return { pages: [] }

        console.log(oldData)
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            data: page.data.map((todoList) => {
              console.log(todoList._id)
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

      return { oldTodoLists, oldAuthData, oldPublicTodoLists }
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["completedTodos"] })
    },
    onError: (err, variables, context) => {
      showAppToast(err.message || "Failed to complete todo", "error")
      queryClient.setQueryData(["todoLists"], context.oldTodoLists)
      queryClient.setQueryData(["authUser"], context.oldAuthData)
      queryClient.setQueryData(["publicTodoLists"], context.oldPublicTodoLists)
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

      queryClient.setQueryData(["todoLists"], (oldData) => {
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
      })

      queryClient.setQueryData(["publicTodoLists"], (oldData) => {
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
      })

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

      queryClient.setQueryData(["todoLists"], (oldData) => {
        const pages = oldData?.pages || []
        console.log(oldData)
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
      })

      queryClient.setQueryData(["publicTodoLists"], (oldData) => {
        const pages = oldData?.pages || []
        console.log(oldData)
        console.log(updatedTodo)
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
      })

      return { oldTodoLists, oldPublicTodoLists }
    },
    onError: (error, updatedTodo, context) => {
      queryClient.setQueryData(["todoLists"], context.oldTodoLists)
      queryClient.setQueryData(["publicTodoLists"], context.oldPublicTodoLists)

      showAppToast(error.message || "Failed to update todo. Please try again.", "error")
    },
    onSettled: () => {
      // After the mutation is complete, invalidate all relevant queries
      // to ensure the cache is synchronized with the server.
      // queryClient.invalidateQueries({ queryKey: ["todos"] })
      // queryClient.invalidateQueries({ queryKey: ["todoLists"] })
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

      queryClient.setQueryData(["publicTodoLists"], (oldData) => {
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
