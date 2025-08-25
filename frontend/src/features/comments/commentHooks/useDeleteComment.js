import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteCommentApi } from "../../../api/commentsApi"
import { postKeys } from "../../posts/postsHooks/postKeys"

export const useDeleteComment = () => {
  const queryClient = useQueryClient()

  const { mutate: deleteComment, isPending: isDeletingComment } = useMutation({
    mutationFn: deleteCommentApi,
    onMutate: async ({ commentId, postId, parentCommentId }) => {
      const commentsQueryKey = parentCommentId
        ? ["comments", postId, parentCommentId]
        : ["comments", postId]

      const parentCommentsQueryKey = ["comments", postId]

      await queryClient.cancelQueries({ queryKey: commentsQueryKey })
      if (parentCommentsQueryKey) {
        await queryClient.cancelQueries({ queryKey: parentCommentsQueryKey })
      }

      const previousCommentsData = queryClient.getQueryData(commentsQueryKey)
      const previousParentCommentsData = queryClient.getQueryData(parentCommentsQueryKey)

      if (previousCommentsData) {
        queryClient.setQueryData(commentsQueryKey, (oldData) => {
          if (!oldData) return oldData
          const newPages = oldData.pages ? [...oldData.pages] : []
          const updatedPages = newPages.map((page) => ({
            ...page,

            comments: page.comments.filter((comment) => comment._id !== commentId),
          }))
          return { ...oldData, pages: updatedPages }
        })
      }

      if (parentCommentId && previousParentCommentsData) {
        queryClient.setQueryData(parentCommentsQueryKey, (oldData) => {
          if (!oldData) return oldData
          const newPages = oldData.pages ? [...oldData.pages] : []
          const updatedPages = newPages.map((page) => ({
            ...page,
            comments: page.comments.map((comment) => {
              if (comment._id === parentCommentId) {
                return {
                  ...comment,
                  repliesCount: (comment.repliesCount -= 1),
                }
              }
              return comment
            }),
          }))
          return { ...oldData, pages: updatedPages }
        })
      }

      return {
        previousCommentsData,
        previousParentCommentsData,
        postId,
        optimisticParentCommentId: parentCommentId,
      }
    },
    onSuccess: (_, {postId}) => {
      queryClient.invalidateQueries({queryKey: postKeys.details(postId)})
    },
    onError: (error, variables, context) => {
      const commentsQueryKey = context.optimisticParentCommentId
        ? ["comments", context.postId, context.optimisticParentCommentId]
        : ["comments", context.postId]

      queryClient.setQueryData(commentsQueryKey, context.previousCommentsData)

      const parentCommentsQueryKey = ["comments", context.postId]
      queryClient.setQueryData(parentCommentsQueryKey, context.previousParentCommentsData)
    },
  })

  return { deleteComment, isDeletingComment }
}
