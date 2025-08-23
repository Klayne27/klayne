import { useMutation, useQueryClient } from "@tanstack/react-query"
import { likeUnlikeTodoListApi } from "../../api/todoListApi"
import { FOLLOWING_TODO_LISTS_QUERY_KEY, PUBLIC_TODO_LISTS_QUERY_KEY } from "../../constants/queryKeys"

export const useLikeUnlikeTodoList = () => {
  const queryClient = useQueryClient()

  const { mutate: likeUnlikeTodoList, isPending: isLiking } = useMutation({
    mutationFn: ({ listId }) => likeUnlikeTodoListApi(listId),

    onMutate: async ({ listId, authUserId }) => {
      await queryClient.cancelQueries({ queryKey: PUBLIC_TODO_LISTS_QUERY_KEY })
      await queryClient.cancelQueries({ queryKey: FOLLOWING_TODO_LISTS_QUERY_KEY })

      const oldPublicTodoLists = queryClient.getQueryData(PUBLIC_TODO_LISTS_QUERY_KEY)
      const oldFollowingTodoLists = queryClient.getQueryData(FOLLOWING_TODO_LISTS_QUERY_KEY)

      queryClient.setQueryData(PUBLIC_TODO_LISTS_QUERY_KEY, (oldData) => {
        return {
          ...oldData,
          pages: oldData?.pages?.map((page) => ({
            ...page,
            data: page.data?.map((todoList) => {
              if (todoList._id === listId) {
                const isLiked = todoList.likes?.includes(authUserId) ?? false
                return {
                  ...todoList,
                  likes: isLiked
                    ? todoList.likes.filter((id) => id !== authUserId)
                    : [...(todoList.likes || []), authUserId],
                }
              }
              return todoList
            }),
          })),
        }
      })

      queryClient.setQueryData(FOLLOWING_TODO_LISTS_QUERY_KEY, (oldData) => {
        return {
          ...oldData,
          pages: oldData?.pages?.map((page) => ({
            ...page,
            data: page.data?.map((todoList) => {
              if (todoList._id === listId) {
                const isLiked = todoList.likes?.includes(authUserId) ?? false
                return {
                  ...todoList,
                  likes: isLiked
                    ? todoList.likes.filter((id) => id !== authUserId)
                    : [...(todoList.likes || []), authUserId],
                }
              }
              return todoList
            }),
          })),
        }
      })

      return { oldPublicTodoLists, oldFollowingTodoLists }
    },

    onError: (err, variables, context) => {
      queryClient.setQueryData(PUBLIC_TODO_LISTS_QUERY_KEY, context.oldPublicTodoLists)
      queryClient.setQueryData(FOLLOWING_TODO_LISTS_QUERY_KEY, context.oldFollowingTodoLists)
    },
  })

  return { likeUnlikeTodoList, isLiking }
}
