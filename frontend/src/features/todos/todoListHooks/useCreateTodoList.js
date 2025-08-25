import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createTodoListApi } from "../../../api/todoListApi"
import { showAppToast } from "../../../utils/showAppToast"
import { todoKeys } from "../todoHooks/todoKeys"

export const useCreateTodoList = () => {
  const queryClient = useQueryClient()

  const { mutate: createTodoList, isPending: creatingTodoList } = useMutation({
    mutationFn: createTodoListApi,
    onMutate: async (newTodoList) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.list("user") })

      const oldTodoLists = queryClient.getQueryData(todoKeys.list("user"))

      const tempId = "temp-" + Date.now()
      const optimisticTodo = { ...newTodoList, _id: tempId, todos: [] }

      queryClient.setQueryData(todoKeys.list("user"), (oldData) => {
        const pages = oldData?.pages || []

        const newPages = pages.map((page, index) => {
          if (index === 0) {
            return {
              ...page,
              data: [optimisticTodo, ...page.data],
            }
          }
          return page
        })

        return { ...oldData, pages: newPages }
      })

      return { oldTodoLists }
    },
    onError: (err, newTodoList, context) => {
      queryClient.setQueryData(todoKeys.list("user"), context.oldTodoLists)
      showAppToast(err.message, "error")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.list("user") })
    },
  })

  return { createTodoList, creatingTodoList }
}
