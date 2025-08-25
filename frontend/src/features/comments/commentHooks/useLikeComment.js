import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { showAppToast } from "../../../utils/showAppToast"
import { likeUnlikeCommentApi } from "../../../api/commentsApi"

export const useLikeComment = () => {
  const queryClient = useQueryClient()
  const { authUser: currentUser } = useAuthUser()

  const { mutate: likeComment, isPending: isLikingComment } = useMutation({
    mutationFn: likeUnlikeCommentApi,
    onMutate: async ({ commentId, postId, parentCommentId }) => {
      const parentCommentQueryKey = ["comments", postId]
      const repliesQueryKey = parentCommentId ? ["comments", postId, parentCommentId] : null

      await queryClient.cancelQueries({ queryKey: parentCommentQueryKey })
      // if (repliesQueryKey) {
        await queryClient.cancelQueries({ queryKey: repliesQueryKey })
      // }

      const previousTopLevelCommentsData = queryClient.getQueryData(parentCommentQueryKey)
      const previousRepliesData = repliesQueryKey ? queryClient.getQueryData(repliesQueryKey) : null

      const updateLikes = (currentComment) => {
        const hasLiked = currentComment.likes.includes(currentUser._id)
        const newLikes = hasLiked
          ? currentComment.likes.filter((id) => id !== currentUser._id)
          : [...currentComment.likes, currentUser._id]
        return { ...currentComment, likes: newLikes }
      }

      queryClient.setQueryData(parentCommentQueryKey, (oldData) => {
        if (!oldData || !oldData.pages) return oldData
        const newPages = oldData.pages.map((page) => ({
          ...page,
          comments: page.comments.map((comment) => {
            if (comment._id === commentId) {
              return updateLikes(comment)
            }
            return comment
          }),
        }))
        return { ...oldData, pages: newPages }
      })

      // if (repliesQueryKey) {
        queryClient.setQueryData(repliesQueryKey, (oldData) => {
          if (!oldData || !oldData.pages) return oldData
          const newPages = oldData.pages.map((page) => ({
            ...page,
            comments: page.comments.map((reply) => {
              if (reply._id === commentId) {
                return updateLikes(reply)
              }
              return reply
            }),
          }))
          return { ...oldData, pages: newPages }
        })
      // }

      return { previousTopLevelCommentsData, previousRepliesData }
    },
    onSuccess: (data, { postId, commentId, parentCommentId }) => {
      // queryClient.setQueryData(["comments", postId], (oldData) => {
      //   if (!oldData || !oldData.pages) return oldData
      //   const newPages = oldData.pages.map((page) => ({
      //     ...page,
      //     comments: page.comments.map((comment) => {
      //       if (comment._id === commentId) {
      //         return { ...comment, likes: data.likes }
      //       }
      //       return comment
      //     }),
      //   }))
      //   return { ...oldData, pages: newPages }
      // })

      // if (parentCommentId) {
      //   queryClient.setQueryData(["comments", postId, parentCommentId], (oldData) => {
      //     if (!oldData || !oldData.pages) return oldData
      //     const newPages = oldData.pages.map((page) => ({
      //       ...page,
      //       comments: page.comments.map((reply) => {
      //         if (reply._id === commentId) {
      //           return { ...reply, likes: data.likes }
      //         }
      //         return reply
      //       }),
      //     }))
      //     return { ...oldData, pages: newPages }
      //   })
      // }
    },
    onError: (error, { postId, parentCommentId }, context) => {
      showAppToast(error.message || "Failed to update comment like status.", "error")
      queryClient.setQueryData(["comments", postId], context.previousTopLevelCommentsData)
      queryClient.setQueryData(["comments", postId, parentCommentId], context.previousRepliesData)
    },
  })

  return { likeComment, isLikingComment }
}
