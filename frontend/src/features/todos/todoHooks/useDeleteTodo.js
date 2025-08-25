import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteTodoApi } from "../../../api/todoApi"
import { showAppToast } from "../../../utils/showAppToast"
import { todoKeys } from "./todoKeys"

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
