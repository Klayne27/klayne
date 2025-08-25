import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateTodoApi } from "../../../api/todoApi"
import { showAppToast } from "../../../utils/showAppToast"
import { todoKeys } from "./todoKeys"

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
