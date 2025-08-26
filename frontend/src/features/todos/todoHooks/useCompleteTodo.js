import { useMutation, useQueryClient } from "@tanstack/react-query"
import { showAppToast } from "../../../utils/showAppToast"
import { calculateXpGainForTodo, findTodoAndParent } from "../../../utils/todoUtils"
import { completeTodoApi } from "../../../api/todoApi"
import useXpStore from "../../../store/useXpStore"
import { todoKeys } from "./todoKeys"
import { userKeys } from "../../users/usersHooks/userKeys"

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

        const optimisticXpGain = calculateXpGainForTodo(todoToComplete, parentList)
        setXpGainedAmount(optimisticXpGain)
        setShowXpGain(true)
        setTimeout(() => setShowXpGain(false), 2000)

        queryClient.setQueryData(userKeys.auth(), (oldData) => {
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
