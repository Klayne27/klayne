import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { toggleBookmarkApi } from "../../../api/postsApi"
import { postKeys } from "./postKeys"
import { showAppToast } from "../../../utils/showAppToast"

const updatePostBookmarkStatus = (oldData, postId, userId) => {
  if (!oldData) return oldData

  const handlePost = (post) => {
    if (!post) return post

    const isRepost = post.repostedFrom?._id === postId
    const targetPost = isRepost ? post.repostedFrom : post

    let updatedPost = { ...post }

    if (targetPost._id === postId) {
      const isBookmarked = targetPost.bookmarkedBy?.includes(userId)
      const newBookmarkedBy = isBookmarked
        ? (targetPost.bookmarkedBy || []).filter((id) => id !== userId)
        : [...(targetPost.bookmarkedBy || []), userId]

      if (isRepost) {
        updatedPost = { ...post, repostedFrom: { ...targetPost, bookmarkedBy: newBookmarkedBy } }
      } else {
        updatedPost = { ...post, bookmarkedBy: newBookmarkedBy }
      }
    }

    // 2. RECURSIVE CHECK: Handle the firstChildReply
    if (updatedPost.firstChildReply) {
      const updatedChild = handlePost(updatedPost.firstChildReply)
      if (updatedChild !== updatedPost.firstChildReply) {
        updatedPost = { ...updatedPost, firstChildReply: updatedChild }
      }
    }

    return updatedPost
  }

  if (oldData.pages) {
    return {
      ...oldData,
      pages: oldData.pages.map((p) => ({
        ...p,
        posts: p.posts?.map(handlePost),
        replies: p.replies?.map(handlePost),
      })),
    }
  }
  if (oldData.ancestors || oldData.post) {
    return {
      ...oldData,
      post: oldData.post ? handlePost(oldData.post) : null,
      ancestors: oldData.ancestors?.map(handlePost),
    }
  }
  if (oldData._id) return handlePost(oldData)
  if (Array.isArray(oldData)) return oldData.map(handlePost)
  return oldData
}

export const useToggleBookmarks = (currentProfileUsername = null) => {
  const queryClient = useQueryClient()
  const { authUser } = useAuthUser()

  const { mutate: toggleBookmark, isPending: isBookmarking } = useMutation({
    mutationFn: toggleBookmarkApi,

    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: postKeys.all })
      const allQueries = queryClient.getQueryCache().getAll()
      const previousData = {}

      allQueries.forEach((query) => {
        const key = query.queryKey
        if (Array.isArray(key) && key[0] === "posts") {
          previousData[JSON.stringify(key)] = queryClient.getQueryData(key)
          queryClient.setQueryData(key, (old) =>
            updatePostBookmarkStatus(old, postId, authUser._id),
          )
        }
      })
      return { previousData }
    },

    onSuccess: (data) => {
      showAppToast(data.message, "success")
    },

    onError: (error, postId, context) => {
      console.error("Error toggling bookmark:", error)
      showAppToast(error.message || "Failed to toggle bookmark", "error")

      if (context) {
        for (const snapshotKey in context) {
          queryClient.setQueryData(JSON.parse(snapshotKey), context[snapshotKey])
        }
      }
    },
  })

  return { toggleBookmark, isBookmarking }
}
