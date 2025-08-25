import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteTodoListApi } from "../../api/todoListApi"
import { showAppToast } from "../../utils/showAppToast"
import { todoKeys } from "../../features/todos/todoHooks/todoKeys"

export const useDeleteTodoList = () => {
  const queryClient = useQueryClient()

  const { mutate: deleteTodoList, isPending: deletingTodoList } = useMutation({
    mutationFn: deleteTodoListApi,
    onMutate: async (listId) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.list("user") })
      await queryClient.cancelQueries({ queryKey: todoKeys.list("public") })

      const oldTodoLists = queryClient.getQueryData(todoKeys.list("user"))
      const oldPublicTodoLists = queryClient.getQueryData(todoKeys.list("public"))

      const updateCache = (oldData) => {
        const pages = oldData?.pages || []

        const newPages = pages.map((page) => ({
          ...page,
          data: page.data.filter((todoList) => todoList._id !== listId),
        }))

        return { ...oldData, pages: newPages }
      }

      queryClient.setQueryData(todoKeys.list("user"), updateCache)
      queryClient.setQueryData(todoKeys.list("public"), updateCache)

      return { oldTodoLists, oldPublicTodoLists }
    },
    onError: (err, listId, context) => {
      queryClient.setQueryData(todoKeys.list("user"), context.oldTodoLists)
      queryClient.setQueryData(todoKeys.list("public"), context.oldPublicTodoLists)
      showAppToast(err.message, "error")
    },
  })

  return { deleteTodoList, deletingTodoList }
}
