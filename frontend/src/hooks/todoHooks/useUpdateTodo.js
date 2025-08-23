import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateTodoApi } from "../../api/todoApi"
import { PUBLIC_TODO_LISTS_QUERY_KEY, TODO_LISTS_QUERY_KEY } from "../../constants/queryKeys"
import { showAppToast } from "../../utils/showAppToast"

export const useUpdateTodo = () => {
  const queryClient = useQueryClient()
  const { mutate: updateTodo, isPending: isUpdatingTodo } = useMutation({
    mutationFn: (data) => updateTodoApi(data.id, data.todoData),
    onMutate: async (updatedTodo) => {
      await queryClient.cancelQueries({ queryKey: TODO_LISTS_QUERY_KEY })
      await queryClient.cancelQueries({ queryKey: PUBLIC_TODO_LISTS_QUERY_KEY })

      const oldTodoLists = queryClient.getQueryData(TODO_LISTS_QUERY_KEY)
      const oldPublicTodoLists = queryClient.getQueryData(PUBLIC_TODO_LISTS_QUERY_KEY)

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

      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, updateCache)
      queryClient.setQueryData(PUBLIC_TODO_LISTS_QUERY_KEY, updateCache)

      return { oldTodoLists, oldPublicTodoLists }
    },
    onError: (error, updatedTodo, context) => {
      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, context.oldTodoLists)
      queryClient.setQueryData(PUBLIC_TODO_LISTS_QUERY_KEY, context.oldPublicTodoLists)

      showAppToast(error.message || "Failed to update todo. Please try again.", "error")
    },
  })

  return { updateTodo, isUpdatingTodo }
}
