import { useMutation, useQueryClient } from "@tanstack/react-query"
import { addCommentApi, replyToCommentApi } from "../../api/commentsApi"
import { useAuthUser } from "../authHooks/useAuthUser"
import { showAppToast } from "../../utils/showAppToast"
import { postKeys } from "../postsHooks/postKeys"

export const useCreateComment = (postId, parentCommentId = null) => {
  const queryClient = useQueryClient()
  const { authUser: currentUser } = useAuthUser()

  const commentsQueryKey = parentCommentId
    ? ["comments", postId, parentCommentId, "replies"]
    : ["comments", postId]

  const { mutate: createComment, isPending: isCreatingComment } = useMutation({
    mutationFn: async ({ text, img }) => {
      if (parentCommentId) {
        return replyToCommentApi({ postId, parentCommentId, text, img })
      } else {
        return addCommentApi({ postId, text, img })
      }
    },
    onMutate: async ({ text, img }) => {
      await queryClient.cancelQueries({ queryKey: postKeys.details(postId) })
      await queryClient.cancelQueries({ queryKey: postKeys.all })

      const previousPostData = queryClient.getQueryData(postKeys.details(postId))
      const previousPostsData = queryClient.getQueryData(postKeys.all)

      const tempId = `optimistic-${Date.now()}-${Math.random()}`

      const optimisticImage = img
        ? {
            _id: `optimistic-img-${Date.now()}-${Math.random()}`,
            imageUrl: img, // Use the base64 data for the optimistic imageUrl
          }
        : null

      const newOptimisticComment = {
        _id: tempId,
        user: {
          _id: currentUser._id,
          username: currentUser.username,
          fullName: currentUser.fullName,
          profileImg: currentUser.profileImg,
          isVerified: currentUser.isVerified,
          isGoldVerified: currentUser.isGoldVerified,
          badges: currentUser.badges,
        },
        post: postId,
        text: text,
        img: img,
        image: optimisticImage,
        parentComment: parentCommentId,
        likes: [],
        repliesCount: 0,
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      }

      queryClient.setQueryData(commentsQueryKey, (oldData) => {
        const newPages = oldData?.pages ? [...oldData.pages] : []
        if (newPages.length === 0) {
          newPages.push({ comments: [], hasNextPage: false })
        }
        newPages[0] = {
          ...newPages[0],
          comments: [...newPages[0].comments, newOptimisticComment].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          ),
        }
        return { ...oldData, pages: newPages }
      })

      const updatePostCommentsCount = (post) => {
        const targetPost = post.repostedFrom ? post.repostedFrom : post
        return post.repostedFrom
          ? {
              ...post,
              repostedFrom: {
                ...targetPost,
                commentsCount: (targetPost.commentsCount || 0) + 1,
              },
            }
          : {
              ...post,
              commentsCount: (targetPost.commentsCount || 0) + 1,
            }
      }

      if (previousPostData) {
        queryClient.setQueryData(postKeys.details(postId), (oldPostData) => {
          if (!oldPostData) return oldPostData
          return updatePostCommentsCount(oldPostData)
        })
      }

      queryClient.setQueryData(postKeys.all, (oldData) => {
        if (!oldData || !Array.isArray(oldData.pages)) return oldData
        const newPages = oldData.pages.map((page) => ({
          ...page,
          posts: page.posts.map((post) => {
            if (post._id === postId || post.repostedFrom?._id === postId) {
              return updatePostCommentsCount(post)
            }
            return post
          }),
        }))
        return { ...oldData, pages: newPages }
      })

      if (parentCommentId) {
        const parentCommentsListQueryKey = ["comments", postId]
        await queryClient.cancelQueries({ queryKey: parentCommentsListQueryKey })
        const previousParentCommentsData = queryClient.getQueryData(parentCommentsListQueryKey)

        if (previousParentCommentsData) {
          queryClient.setQueryData(parentCommentsListQueryKey, (oldParentCommentsData) => {
            if (!oldParentCommentsData) return oldParentCommentsData
            const updatedPages = oldParentCommentsData.pages.map((page) => ({
              ...page,
              comments: page.comments.map((comment) =>
                comment._id === parentCommentId
                  ? { ...comment, repliesCount: (comment.repliesCount || 0) + 1 }
                  : comment,
              ),
            }))
            return { ...oldParentCommentsData, pages: updatedPages }
          })
        }
      }

      return {
        previousPostData,
        previousPostsData,
        previousParentCommentsData: parentCommentId
          ? queryClient.getQueryData(["comments", postId])
          : undefined,
        newOptimisticCommentId: tempId,
      }
    },
    onSuccess: (newRealComment, variables, context) => {
      showAppToast(parentCommentId ? "Reply added!" : "Comment added!", "success")

      queryClient.setQueryData(commentsQueryKey, (oldData) => {
        const newPages = oldData?.pages ? [...oldData.pages] : []
        if (newPages.length === 0) {
          newPages.push({ comments: [], hasNextPage: false })
        }
        newPages[0] = {
          ...newPages[0],
          comments: newPages[0].comments.map((comment) =>
            comment._id === context.newOptimisticCommentId
              ? { ...newRealComment, isOptimistic: false }
              : comment,
          ),
        }
        newPages[0].comments.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
        return { ...oldData, pages: newPages }
      })

      queryClient.invalidateQueries({ queryKey: postKeys.all })
      if (parentCommentId) {
        queryClient.invalidateQueries({ queryKey: ["comments", postId] })
      }
    },
    onError: (error, variables, context) => {
      showAppToast(error.message || "Failed to add comment.", "error")
      queryClient.setQueryData(commentsQueryKey, context.previousComments)
      queryClient.setQueryData(postKeys.details(postId), context.previousPostData)
      queryClient.setQueryData(postKeys.all, context.previousPostsData)
      queryClient.setQueryData(["comments", postId], context.previousParentCommentsData)
    },
  })

  return { createComment, isCreatingComment }
}
