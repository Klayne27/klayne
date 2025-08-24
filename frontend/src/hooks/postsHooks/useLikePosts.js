import { useMutation, useQueryClient } from "@tanstack/react-query"
import { likePostApi } from "../../api/postsApi"
import { useAuthUser } from "../authHooks/useAuthUser"
import { showAppToast } from "../../utils/showAppToast"
import { postKeys } from "./postKeys"

// Centralized function to update a post's likes optimistically.
// This handles both paginated and single-post data structures.
const updatePostLikes = (oldData, postId, userId) => {
  if (!oldData) return oldData

  const handlePost = (post) => {
    // If this is a repost, update the original post
    const targetPost = post.repostedFrom?._id === postId ? post.repostedFrom : post

    if (targetPost._id === postId) {
      const isLiked = targetPost.likes?.includes(userId)
      const newLikes = isLiked
        ? (targetPost.likes || []).filter((id) => id !== userId)
        : [...(targetPost.likes || []), userId]

      if (post.repostedFrom?._id === postId) {
        return { ...post, repostedFrom: { ...targetPost, likes: newLikes } }
      }
      return { ...post, likes: newLikes }
    }
    return post
  }

  // Handle paginated list data
  if (oldData.pages) {
    const newPages = oldData.pages.map((page) => ({
      ...page,
      posts: (page.posts || []).map(handlePost),
    }))
    return { ...oldData, pages: newPages }
  }

  // Handle single post object data
  if (oldData._id) {
    return handlePost(oldData)
  }

  // Handle a simple array of posts
  if (Array.isArray(oldData)) {
    return oldData.map(handlePost)
  }

  return oldData
}

export const useLikePost = (username = null) => {
  const queryClient = useQueryClient()
  const { authUser } = useAuthUser()

  const { mutate: likePost, isPending: isLiking } = useMutation({
    mutationFn: (postId) => likePostApi(postId),

    onMutate: async (postId) => {
      if (!authUser?._id) {
        console.warn("No authenticated user ID for optimistic post like update.")
        return
      }

      // Define all relevant keys using the factory.
      const keysToUpdate = [
        postKeys.list("/api/posts/all"),
        postKeys.list("/api/posts/following"),
        postKeys.bookmarked(),
        postKeys.pinned(username),
        postKeys.details(postId),
        postKeys.user(username),
        postKeys.likes(username),
      ].filter((key) => queryClient.getQueryData(key)) // Only work with keys that have existing data.

      // Cancel all relevant queries to prevent them from refetching
      await Promise.all(keysToUpdate.map((key) => queryClient.cancelQueries({ queryKey: key })))

      // Take a single snapshot of all the relevant data before the update
      const previousData = keysToUpdate.reduce((acc, key) => {
        acc[JSON.stringify(key)] = queryClient.getQueryData(key)
        return acc
      }, {})

      // Optimistically update the cache for each relevant key
      keysToUpdate.forEach((key) => {
        queryClient.setQueryData(key, (oldData) => updatePostLikes(oldData, postId, authUser._id))
      })

      // Return the snapshot for rollback in case of an error
      return { previousData }
    },

    onSuccess: (data, postId) => {
      // Invalidate all related post keys to ensure data consistency
      // The optimistic update handles the immediate UI change,
      // and invalidation ensures the data is eventually consistent.
      // queryClient.invalidateQueries({ queryKey: postKeys.all })
    },

    onError: (error, postId, context) => {
      showAppToast(error.message || "Failed to like/unlike post.")

      // Rollback all changes using the single snapshot
      if (context?.previousData) {
        Object.entries(context.previousData).forEach(([key, value]) => {
          queryClient.setQueryData(JSON.parse(key), value)
        })
      }
    },
  })

  return { likePost, isLiking }
}
