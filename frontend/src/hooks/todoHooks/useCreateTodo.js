import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createTodoApi } from "../../api/todoApi"
import { PUBLIC_TODO_LISTS_QUERY_KEY, TODO_LISTS_QUERY_KEY } from "../../constants/queryKeys"
import { showAppToast } from "../../utils/showAppToast"

export const useCreateTodo = () => {
  const queryClient = useQueryClient()

  const { mutate: createTodo, isPending: isCreatingTodo } = useMutation({
    mutationFn: createTodoApi,
    onMutate: async (newTodo) => {
      await queryClient.cancelQueries({ queryKey: TODO_LISTS_QUERY_KEY })
      await queryClient.cancelQueries({ queryKey: PUBLIC_TODO_LISTS_QUERY_KEY })

      const oldTodoLists = queryClient.getQueryData(TODO_LISTS_QUERY_KEY)
      const oldPublicTodoLists = queryClient.getQueryData(PUBLIC_TODO_LISTS_QUERY_KEY)

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

      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, updateCache)
      queryClient.setQueryData(PUBLIC_TODO_LISTS_QUERY_KEY, updateCache)

      return { oldTodoLists, oldPublicTodoLists }
    },
    onError: (error, newTodo, context) => {
      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, context.oldTodoLists)
      queryClient.setQueryData(PUBLIC_TODO_LISTS_QUERY_KEY, context.oldPublicTodoLists)

      showAppToast(error.message || "Failed to create todo. Please try again.", "error")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODO_LISTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: PUBLIC_TODO_LISTS_QUERY_KEY })
    },
  })

  return { createTodo, isCreatingTodo }
}
