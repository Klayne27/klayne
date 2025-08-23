import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateTodoListApi } from "../../api/todoListApi"
import { PUBLIC_TODO_LISTS_QUERY_KEY, TODO_LISTS_QUERY_KEY } from "../../constants/queryKeys"
import { showAppToast } from "../../utils/showAppToast"

export const useUpdateTodoList = () => {
  const queryClient = useQueryClient()

  const { mutate: updateTodoList, isPending: isUpdatingTodoList } = useMutation({
    mutationFn: (data) => updateTodoListApi(data.id, data.listData),
    onMutate: async ({ id, listData }) => {
      await queryClient.cancelQueries({ queryKey: TODO_LISTS_QUERY_KEY })
      await queryClient.cancelQueries({ queryKey: PUBLIC_TODO_LISTS_QUERY_KEY })

      const oldTodoLists = queryClient.getQueryData(TODO_LISTS_QUERY_KEY)
      const oldPublicTodoLists = queryClient.getQueryData(PUBLIC_TODO_LISTS_QUERY_KEY)

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

      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, updateCache)
      queryClient.setQueryData(PUBLIC_TODO_LISTS_QUERY_KEY, updateCache)

      return { oldTodoLists, oldPublicTodoLists }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, context.oldTodoLists)
      queryClient.setQueryData(PUBLIC_TODO_LISTS_QUERY_KEY, context.oldPublicTodoLists)
      showAppToast(err.message, "error")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TODO_LISTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: PUBLIC_TODO_LISTS_QUERY_KEY })
    },
  })

  return { updateTodoList, isUpdatingTodoList }
}
