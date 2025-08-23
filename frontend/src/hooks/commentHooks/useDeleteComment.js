import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteCommentApi } from "../../api/commentsApi"

export const useDeleteComment = () => {
  const queryClient = useQueryClient()

  const { mutate: deleteComment, isPending: isDeletingComment } = useMutation({
    mutationFn: deleteCommentApi,
    onMutate: async ({ commentId, postId, parentCommentId }) => {
      const context = {
        previousCommentsData: undefined,
        previousPostData: undefined,
        previousParentCommentsData: undefined,
        optimisticRemovedCommentId: commentId,
        optimisticParentCommentId: parentCommentId,
      }

      const commentsQueryKey = parentCommentId
        ? ["comments", postId, parentCommentId]
        : ["comments", postId]

      await queryClient.cancelQueries({ queryKey: commentsQueryKey })
      context.previousCommentsData = queryClient.getQueryData(commentsQueryKey)

      if (context.previousCommentsData) {
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

      const postQueryKey = ["post", postId]
      await queryClient.cancelQueries({ queryKey: postQueryKey })
      context.previousPostData = queryClient.getQueryData(postQueryKey)

      if (parentCommentId) {
        const parentCommentsListQueryKey = ["comments", postId]
        await queryClient.cancelQueries({ queryKey: parentCommentsListQueryKey })
        context.previousParentCommentsData = queryClient.getQueryData(parentCommentsListQueryKey)

        if (context.previousParentCommentsData) {
          queryClient.setQueryData(parentCommentsListQueryKey, (oldParentCommentsData) => {
            if (!oldParentCommentsData) return oldParentCommentsData
            const updatedPages = oldParentCommentsData.pages.map((page) => ({
              ...page,
              comments: page.comments.map((comment) =>
                comment._id === parentCommentId
                  ? {
                      ...comment,
                      repliesCount: Math.max(0, (comment.repliesCount || 0) - 1),
                    }
                  : comment,
              ),
            }))
            return { ...oldParentCommentsData, pages: updatedPages }
          })
        }
      }

      return context
    },
    onSuccess: (data, { postId, parentCommentId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] })
      if (parentCommentId) {
        queryClient.invalidateQueries({
          queryKey: ["comments", postId, parentCommentId],
        })
      }

      queryClient.invalidateQueries({ queryKey: ["post", postId] })
      queryClient.invalidateQueries({ queryKey: ["posts"] })
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
    onError: (error, variables, context) => {
      const commentsQueryKey = context.optimisticParentCommentId
        ? ["comments", variables.postId, context.optimisticParentCommentId]
        : ["comments", variables.postId]
      queryClient.setQueryData(commentsQueryKey, context.previousCommentsData)
      queryClient.setQueryData(["post", variables.postId], context.previousPostData)
      queryClient.setQueryData(["comments", variables.postId], context.previousParentCommentsData)
    },
  })

  return { deleteComment, isDeletingComment }
}
