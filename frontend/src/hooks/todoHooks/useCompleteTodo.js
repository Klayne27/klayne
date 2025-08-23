import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AUTH_USER_QUERY_KEY, PUBLIC_TODO_LISTS_QUERY_KEY, TODO_LISTS_QUERY_KEY } from "../../constants/queryKeys"
import { showAppToast } from "../../utils/showAppToast"
import { calculateXpGainForTodo, findTodoAndParent } from "../../utils/todoUtils"
import { completeTodoApi } from "../../api/todoApi"
import useXpStore from "../../store/useXpStore"

export const useCompleteTodo = () => {
  const queryClient = useQueryClient()
  const { setShowXpGain, setXpGainedAmount } = useXpStore()

  const { mutate: completeTodo } = useMutation({
    mutationFn: completeTodoApi,

    onMutate: async (todoId) => {
      const oldAuthData = queryClient.getQueryData(AUTH_USER_QUERY_KEY)
      const oldTodoLists = queryClient.getQueryData(TODO_LISTS_QUERY_KEY)
      const oldPublicTodoLists = queryClient.getQueryData(PUBLIC_TODO_LISTS_QUERY_KEY)

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

        queryClient.setQueryData(AUTH_USER_QUERY_KEY, (oldData) => {
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

      queryClient.setQueryData(PUBLIC_TODO_LISTS_QUERY_KEY, updateCache)
      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, updateCache)

      return { oldTodoLists, oldAuthData, oldPublicTodoLists }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, context.oldTodoLists)
      queryClient.setQueryData(AUTH_USER_QUERY_KEY, context.oldAuthData)
      queryClient.setQueryData(PUBLIC_TODO_LISTS_QUERY_KEY, context.oldPublicTodoLists)
      showAppToast(err.message || "Failed to complete todo", "error")
    },
  })

  return { completeTodo }
}
