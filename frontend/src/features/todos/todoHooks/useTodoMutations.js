import { useMutation, useQueryClient } from "@tanstack/react-query"
import { todoKeys } from "./todoKeys"
import { completeTodoApi, createTodoApi, deleteTodoApi, updateTodoApi } from "../../../api/todoApi"
import { showAppToast } from "../../../utils/showAppToast"
import { userKeys } from "../../users/usersHooks/userKeys"
import { calculateXpGainForTodo, findTodoAndParent } from "../../../utils/todoUtils"
import useXpStore from "../../../store/useXpStore"

export const useCreateTodo = () => {
  const queryClient = useQueryClient()

  const { mutate: createTodo, isPending: isCreatingTodo } = useMutation({
    mutationFn: createTodoApi,
    onMutate: async (newTodo) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.list("user") })
      await queryClient.cancelQueries({ queryKey: todoKeys.list("public") })

      const oldTodoLists = queryClient.getQueryData(todoKeys.list("user"))
      const oldPublicTodoLists = queryClient.getQueryData(todoKeys.list("public"))

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

      queryClient.setQueryData(todoKeys.list("user"), updateCache)
      queryClient.setQueryData(todoKeys.list("public"), updateCache)

      return { oldTodoLists, oldPublicTodoLists }
    },
    onError: (error, newTodo, context) => {
      queryClient.setQueryData(todoKeys.list("user"), context.oldTodoLists)
      queryClient.setQueryData(todoKeys.list("public"), context.oldPublicTodoLists)

      showAppToast(error.message || "Failed to create todo. Please try again.", "error")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.list("user") })
      queryClient.invalidateQueries({ queryKey: todoKeys.list("public") })
    },
  })

  return { createTodo, isCreatingTodo }
}

export const useDeleteTodo = () => {
  const queryClient = useQueryClient()
  const { mutate: deleteTodo, isPending: isDeletingTodo } = useMutation({
    mutationFn: deleteTodoApi,
    onMutate: async (todoIdToDelete) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.list("user") })
      await queryClient.cancelQueries({ queryKey: todoKeys.list("public") })

      const oldTodoLists = queryClient.getQueryData(todoKeys.list("user"))
      const oldPublicTodoLists = queryClient.getQueryData(todoKeys.list("public"))

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

      queryClient.setQueryData(todoKeys.list("user"), updateCache)
      queryClient.setQueryData(todoKeys.list("public"), updateCache)

      return { oldTodoLists, oldPublicTodoLists }
    },
    onError: (error, todoIdToDelete, context) => {
      queryClient.setQueryData(todoKeys.list("user"), context.oldTodoLists)
      queryClient.setQueryData(todoKeys.list("public"), context.oldPublicTodoLists)

      showAppToast(error.message || "Failed to delete todo. Please try again.", "error")
    },
  })

  return { deleteTodo, isDeletingTodo }
}

export const useUpdateTodo = () => {
  const queryClient = useQueryClient()
  const { mutate: updateTodo, isPending: isUpdatingTodo } = useMutation({
    mutationFn: (data) => updateTodoApi(data.id, data.todoData),
    onMutate: async (updatedTodo) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.list("user") })
      await queryClient.cancelQueries({ queryKey: todoKeys.list("public") })

      const oldTodoLists = queryClient.getQueryData(todoKeys.list("user"))
      const oldPublicTodoLists = queryClient.getQueryData(todoKeys.list("public"))

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

      queryClient.setQueryData(todoKeys.list("user"), updateCache)
      queryClient.setQueryData(todoKeys.list("public"), updateCache)

      return { oldTodoLists, oldPublicTodoLists }
    },
    onError: (error, updatedTodo, context) => {
      queryClient.setQueryData(todoKeys.list("user"), context.oldTodoLists)
      queryClient.setQueryData(todoKeys.list("public"), context.oldPublicTodoLists)

      showAppToast(error.message || "Failed to update todo. Please try again.", "error")
    },
  })

  return { updateTodo, isUpdatingTodo }
}

export const useCompleteTodo = () => {
  const queryClient = useQueryClient()
  const { setShowXpGain, setXpGainedAmount } = useXpStore()

  const { mutate: completeTodo } = useMutation({
    mutationFn: completeTodoApi,

    onMutate: async (todoId) => {
      const oldAuthData = queryClient.getQueryData(userKeys.auth())
      const oldTodoLists = queryClient.getQueryData(todoKeys.list("user"))
      const oldPublicTodoLists = queryClient.getQueryData(todoKeys.list("public"))

      let found = findTodoAndParent(oldTodoLists, todoId)
      if (!found) {
        found = findTodoAndParent(oldPublicTodoLists, todoId)
      }

      if (found) {
        const { todoToComplete, parentList } = found

        // const optimisticXpGain = calculateXpGainForTodo(todoToComplete, parentList)
        // setXpGainedAmount(optimisticXpGain)
        // setShowXpGain(true)
        // setTimeout(() => setShowXpGain(false), 2000)

        queryClient.setQueryData(userKeys.auth(), (oldData) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            // pomodoroXP: oldData.pomodoroXP + optimisticXpGain,
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

      queryClient.setQueryData(todoKeys.list("public"), updateCache)
      queryClient.setQueryData(todoKeys.list("user"), updateCache)

      return { oldTodoLists, oldAuthData, oldPublicTodoLists }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(todoKeys.list("public"), context.oldPublicTodoLists)
      queryClient.setQueryData(todoKeys.list("user"), context.oldTodoLists)
      queryClient.setQueryData(userKeys.auth(), context.oldAuthData)
      showAppToast(err.message || "Failed to complete todo", "error")
    },
  })

  return { completeTodo }
}

