import { useMutation, useQueryClient } from "@tanstack/react-query"
import { todoKeys } from "./todoKeys"
import { createTodoApi } from "../../../api/todoApi"
import { showAppToast } from "../../../utils/showAppToast"

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
