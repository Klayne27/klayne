import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toggleBookmarkApi } from "../../api/postsApi"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { showAppToast } from "../../utils/showAppToast"
import { postKeys } from "./postKeys"

const updatePostBookmarkStatus = (data, postId, userId) => {
  if (!data) return data

  const handlePost = (post) => {
    const targetPost = post.repostedFrom?._id === postId ? post.repostedFrom : post
    const isTarget = targetPost._id === postId

    if (isTarget) {
      const isAlreadyBookmarked = targetPost.bookmarkedBy?.includes(userId)
      const newBookmarkedBy = isAlreadyBookmarked
        ? (targetPost.bookmarkedBy || []).filter((id) => id !== userId)
        : [...(targetPost.bookmarkedBy || []), userId]

      if (post.repostedFrom?._id === postId) {
        return {
          ...post,
          repostedFrom: { ...targetPost, bookmarkedBy: newBookmarkedBy },
        }
      }
      return { ...post, bookmarkedBy: newBookmarkedBy }
    }
    return post
  }

  if (data._id) {
    return handlePost(data)
  }

  if (Array.isArray(data)) {
    return data.map(handlePost)
  }

  if (data.pages) {
    const newPages = data.pages.map((page) => ({
      ...page,
      posts: (page.posts || []).map(handlePost),
    }))

    if (JSON.stringify(data.queryKey) === JSON.stringify(postKeys.bookmarked())) {
      const newFilteredPages = newPages.map((page) => ({
        ...page,
        posts: page.posts.filter((p) => p.bookmarkedBy?.includes(userId)),
      }))
      return { ...data, pages: newFilteredPages }
    }

    return { ...data, pages: newPages }
  }

  return data
}

export const useToggleBookmarks = (currentProfileUsername = null) => {
  const queryClient = useQueryClient()
  const { authUser } = useAuthUser()

  const { mutate: toggleBookmark, isPending: isBookmarking } = useMutation({
    mutationFn: toggleBookmarkApi,

    onMutate: async (postId) => {
      if (!authUser?._id) {
        console.warn("No authenticated user ID for optimistic bookmark update.")
        return
      }

      const keysToUpdate = [
        postKeys.list("/api/posts/all"),
        postKeys.list("/api/posts/following"),
        postKeys.bookmarked(),
        postKeys.details(postId),
        postKeys.user(currentProfileUsername),
        postKeys.likes(currentProfileUsername),
        postKeys.pinned(currentProfileUsername),
      ].filter((key) => queryClient.getQueryData(key) !== undefined)

      await Promise.all(keysToUpdate.map((key) => queryClient.cancelQueries({ queryKey: key })))

      const previousDataSnapshots = keysToUpdate.reduce((acc, key) => {
        const snapshotKey = JSON.stringify(key)
        acc[snapshotKey] = queryClient.getQueryData(key)
        return acc
      }, {})

      keysToUpdate.forEach((key) => {
        queryClient.setQueryData(key, (oldData) =>
          updatePostBookmarkStatus(oldData, postId, authUser._id),
        )
      })

      return previousDataSnapshots
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
