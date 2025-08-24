import { useMutation, useQueryClient } from "@tanstack/react-query"
import { likeUnlikeTodoListApi } from "../../api/todoListApi"
import { todoKeys } from "../todoHooks/todoKeys"

export const useLikeUnlikeTodoList = () => {
  const queryClient = useQueryClient()

  const { mutate: likeUnlikeTodoList, isPending: isLiking } = useMutation({
    mutationFn: ({ listId }) => likeUnlikeTodoListApi(listId),

    onMutate: async ({ listId, authUserId }) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.list("public") })
      await queryClient.cancelQueries({ queryKey: todoKeys.list("following") })

      const oldPublicTodoLists = queryClient.getQueryData(todoKeys.list("public"))
      const oldFollowingTodoLists = queryClient.getQueryData(todoKeys.list("following"))

      queryClient.setQueryData(todoKeys.list("public"), (oldData) => {
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

      queryClient.setQueryData(todoKeys.list("following"), (oldData) => {
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
      queryClient.setQueryData(todoKeys.list("public"), context.oldPublicTodoLists)
      queryClient.setQueryData(todoKeys.list("following"), context.oldFollowingTodoLists)
    },
  })

  return { likeUnlikeTodoList, isLiking }
}
