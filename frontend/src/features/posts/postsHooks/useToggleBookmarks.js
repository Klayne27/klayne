import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { toggleBookmarkApi } from "../../../api/postsApi"
import { postKeys } from "./postKeys"
import { showAppToast } from "../../../utils/showAppToast"

const updatePostBookmarkStatus = (oldData, postId, userId) => {
  if (!oldData) return oldData
  const handlePost = (post) => {
    if (!post) return post
    const targetPost = post.repostedFrom?._id === postId ? post.repostedFrom : post
    if (targetPost._id === postId) {
      const isBookmarked = targetPost.bookmarkedBy?.includes(userId)
      const newBookmarkedBy = isBookmarked
        ? (targetPost.bookmarkedBy || []).filter((id) => id !== userId)
        : [...(targetPost.bookmarkedBy || []), userId]
      return post.repostedFrom?._id === postId
        ? { ...post, repostedFrom: { ...targetPost, bookmarkedBy: newBookmarkedBy } }
        : { ...post, bookmarkedBy: newBookmarkedBy }
    }
    return post
  }

  if (oldData.pages) {
    const newPages = oldData.pages.map((p) => ({
      ...p,
      posts: p.posts?.map(handlePost),
      replies: p.replies?.map(handlePost),
    }))
    return { ...oldData, pages: newPages }
  }
  if (oldData.ancestors || oldData.post)
    return {
      ...oldData,
      post: handlePost(oldData.post),
      ancestors: oldData.ancestors?.map(handlePost),
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
