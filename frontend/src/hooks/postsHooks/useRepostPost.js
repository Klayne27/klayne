import { useQueryClient, useMutation } from "@tanstack/react-query"
import { useAuthUser } from "../authHooks/useAuthUser"
import { showAppToast } from "../../utils/showAppToast"
import { postKeys } from "./postKeys"

// Centralized function to handle optimistic repost updates across different data structures.
const updatePostRepostStatus = (oldData, postId, userId) => {
  if (!oldData) return oldData

  const handlePost = (post) => {
    // Determine the post to update (could be the original or a repost)
    const targetPost = post.repostedFrom?._id === postId ? post.repostedFrom : post
    const isTarget = targetPost._id === postId

    if (isTarget) {
      const isReposted = targetPost.repostedBy?.includes(userId)
      const newRepostedBy = isReposted
        ? (targetPost.repostedBy || []).filter((id) => id !== userId)
        : [...(targetPost.repostedBy || []), userId]

      const newRepostCount = newRepostedBy.length

      // Return a new post object with the updated repost status
      if (post.repostedFrom?._id === postId) {
        return {
          ...post,
          repostedFrom: { ...targetPost, repostedBy: newRepostedBy, repostsCount: newRepostCount },
        }
      }
      return { ...post, repostedBy: newRepostedBy, repostsCount: newRepostCount }
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

  // Handle a single post object
  if (oldData._id) {
    return handlePost(oldData)
  }

  return oldData
}

export const useRepostPost = (username) => {
  const queryClient = useQueryClient()
  const { authUser } = useAuthUser()

  const { mutate: repostPost, isPending: isReposting } = useMutation({
    mutationFn: async (postId) => {
      const response = await fetch(`/api/posts/repost/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to toggle repost status")
      }
      return data
    },

    onMutate: async (postId) => {
      // Define all relevant keys using the factory
      const keysToUpdate = [
        postKeys.list("/api/posts/all"),
        postKeys.list("/api/posts/following"),
        postKeys.bookmarked(),
        postKeys.details(postId),
        postKeys.user(username),
        postKeys.likes(username),
      ].filter((key) => queryClient.getQueryData(key) !== undefined)

      await Promise.all(keysToUpdate.map((key) => queryClient.cancelQueries({ queryKey: key })))

      const previousData = keysToUpdate.reduce((acc, key) => {
        acc[JSON.stringify(key)] = queryClient.getQueryData(key)
        return acc
      }, {})

      // Perform the optimistic update on all relevant caches
      keysToUpdate.forEach((key) => {
        queryClient.setQueryData(key, (oldData) =>
          updatePostRepostStatus(oldData, postId, authUser._id),
        )
      })

      return { previousData }
    },

    onSuccess: (data) => {
      showAppToast(data.message || "Success!", "success")
      // Invalidate broader post feeds to refresh from the server.
    
    },

    onError: (err, postId, context) => {
      showAppToast(err.message || "Could not update repost.", "error")
      if (context?.previousData) {
        Object.entries(context.previousData).forEach(([key, value]) => {
          queryClient.setQueryData(JSON.parse(key), value)
        })
      }
    },
  })

  return { repostPost, isReposting }
}
