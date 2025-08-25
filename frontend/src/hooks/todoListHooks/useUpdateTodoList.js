import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateTodoListApi } from "../../api/todoListApi"
import { showAppToast } from "../../utils/showAppToast"
import { todoKeys } from "../../features/todos/todoHooks/todoKeys"

export const useUpdateTodoList = () => {
  const queryClient = useQueryClient()

  const { mutate: updateTodoList, isPending: isUpdatingTodoList } = useMutation({
    mutationFn: (data) => updateTodoListApi(data.id, data.listData),
    onMutate: async ({ id, listData }) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.list("user") })
      await queryClient.cancelQueries({ queryKey: todoKeys.list("public") })

      const oldTodoLists = queryClient.getQueryData(todoKeys.list("user"))
      const oldPublicTodoLists = queryClient.getQueryData(todoKeys.list("public"))

      const updateCache = (oldData) => {
        const pages = oldData?.pages || []

        const newPages = pages.map((page) => ({
          ...page,
          data: page.data.map((todoList) =>
            todoList._id === id ? { ...todoList, ...listData } : todoList,
          ),
        }))

        return { ...oldData, pages: newPages }
      }

      queryClient.setQueryData(todoKeys.list("user"), updateCache)
      queryClient.setQueryData(todoKeys.list("public"), updateCache)

      return { oldTodoLists, oldPublicTodoLists }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(todoKeys.list("user"), context.oldTodoLists)
      queryClient.setQueryData(todoKeys.list("public"), context.oldPublicTodoLists)
      showAppToast(err.message, "error")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.list("user") })
      queryClient.invalidateQueries({ queryKey: todoKeys.list("public") })
    },
  })

  return { updateTodoList, isUpdatingTodoList }
}
