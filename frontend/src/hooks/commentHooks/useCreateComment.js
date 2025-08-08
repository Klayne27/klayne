import { useMutation, useQueryClient } from "@tanstack/react-query"
import { addCommentApi, replyToCommentApi } from "../../api/commentsApi"
import { useAuthUser } from "../authHooks/useAuthUser"
import { showAppToast } from "../../utils/showAppToast"

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
      if (!currentUser?._id) {
        console.warn("No authenticated user ID for optimistic comment update.")
        return
      }
      await queryClient.cancelQueries({ queryKey: commentsQueryKey })
      await queryClient.cancelQueries({ queryKey: ["post", postId] })
      await queryClient.cancelQueries({ queryKey: ["posts"] })
      await queryClient.cancelQueries({ queryKey: ["bookmarkedPosts"] })
      await queryClient.cancelQueries({
        queryKey: ["pinnedPosts", currentUser.username],
      })

      const previousComments = queryClient.getQueryData(commentsQueryKey)
      const previousPostData = queryClient.getQueryData(["post", postId])
      const previousPostsData = queryClient.getQueryData(["posts"])
      const previousBookmarkedPostsData = queryClient.getQueryData(["bookmarkedPosts"])
      const previousPinnedPostsData = queryClient.getQueryData([
        "pinnedPosts",
        currentUser.username,
      ])

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
        queryClient.setQueryData(["post", postId], (oldPostData) => {
          if (!oldPostData) return oldPostData
          return updatePostCommentsCount(oldPostData)
        })
      }

      queryClient.setQueryData(["posts"], (oldData) => {
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

      queryClient.setQueryData(["bookmarkedPosts"], (oldData) => {
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

      queryClient.setQueryData(["pinnedPosts", currentUser.username], (oldData) => {
        if (!oldData || !Array.isArray(oldData)) return oldData
        return oldData.map((post) => {
          if (post._id === postId || post.repostedFrom?._id === postId) {
            return updatePostCommentsCount(post)
          }
          return post
        })
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
        previousComments,
        previousPostData,
        previousPostsData,
        previousBookmarkedPostsData,
        previousPinnedPostsData,
        previousParentCommentsData: parentCommentId
          ? queryClient.getQueryData(["comments", postId])
          : undefined,
        newOptimisticCommentId: tempId,
      }
    },
    onSuccess: (newRealComment, variables, context) => {
      showAppToast(parentCommentId ? "Reply added!" : "Comment added!", "success")

      // Update the optimistic comment with real data
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

      queryClient.invalidateQueries({ queryKey: ["post", postId] })
      queryClient.invalidateQueries({ queryKey: ["posts"] })
      queryClient.invalidateQueries({ queryKey: ["bookmarkedPosts"] })
      queryClient.invalidateQueries({ queryKey: ["pinnedPosts"] })
      if (parentCommentId) {
        queryClient.invalidateQueries({ queryKey: ["comments", postId] })
      }
    },
    onError: (error, variables, context) => {
      showAppToast(error.message || "Failed to add comment.", "error")
      if (context.previousComments) {
        queryClient.setQueryData(commentsQueryKey, context.previousComments)
      }
      if (context.previousPostData) {
        queryClient.setQueryData(["post", postId], context.previousPostData)
      }
      if (context.previousPostsData) {
        queryClient.setQueryData(["posts"], context.previousPostsData)
      }
      if (context.previousBookmarkedPostsData) {
        queryClient.setQueryData(["bookmarkedPosts"], context.previousBookmarkedPostsData)
      }
      if (context.previousPinnedPostsData && currentUser?.username) {
        queryClient.setQueryData(
          ["pinnedPosts", currentUser.username],
          context.previousPinnedPostsData,
        )
      }
      if (parentCommentId && context.previousParentCommentsData) {
        queryClient.setQueryData(["comments", postId], context.previousParentCommentsData)
      }
    },
  })

  return { createComment, isCreatingComment }
}
