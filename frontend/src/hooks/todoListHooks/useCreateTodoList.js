import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createTodoListApi } from "../../api/todoListApi"
import { TODO_LISTS_QUERY_KEY } from "../../constants/queryKeys"
import { showAppToast } from "../../utils/showAppToast"

export const useCreateTodoList = () => {
  const queryClient = useQueryClient()

  const { mutate: createTodoList, isPending: creatingTodoList } = useMutation({
    mutationFn: createTodoListApi,
    onMutate: async (newTodoList) => {
      await queryClient.cancelQueries({ queryKey: TODO_LISTS_QUERY_KEY })

      const oldTodoLists = queryClient.getQueryData(TODO_LISTS_QUERY_KEY)

      const tempId = "temp-" + Date.now()
      const optimisticTodo = { ...newTodoList, _id: tempId, todos: [] }

      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, (oldData) => {
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
      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, context.oldTodoLists)
      showAppToast(err.message, "error")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TODO_LISTS_QUERY_KEY })
    },
  })

  return { createTodoList, creatingTodoList }
}
