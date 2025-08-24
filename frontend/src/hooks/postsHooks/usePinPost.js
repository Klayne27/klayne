import { useMutation, useQueryClient } from "@tanstack/react-query"
import { pinUnpinPostApi, unpinPostApi } from "../../api/postsApi"
import { useAuthUser } from "../authHooks/useAuthUser"
import { showAppToast } from "../../utils/showAppToast"
import { postKeys } from "./postKeys"

// Centralized function to update a post's pin status optimistically.
// This function handles single posts, arrays, and paginated data structures.
const updatePostPinStatus = (oldData, postId, action) => {
  if (!oldData) return oldData

  const handleSinglePost = (post) => {
    const isTarget = post._id === postId || post.repostedFrom?._id === postId
    if (!isTarget) return post

    const targetPost = post.repostedFrom?._id === postId ? post.repostedFrom : post
    const newPinStatus = action === "pin"

    if (post.repostedFrom?._id === postId) {
      return { ...post, repostedFrom: { ...targetPost, isPinned: newPinStatus } }
    }
    return { ...post, isPinned: newPinStatus }
  }

  // Handle paginated list data (e.g., all posts, user posts, bookmarked posts)
  if (oldData.pages) {
    const newPages = oldData.pages.map((page) => ({
      ...page,
      posts: (page.posts || []).map(handleSinglePost),
    }))
    return { ...oldData, pages: newPages }
  }

  // Handle single post object data
  if (oldData._id) {
    return handleSinglePost(oldData)
  }

  // Handle simple array data (e.g., pinned posts)
  if (Array.isArray(oldData)) {
    const targetPost = oldData.find((p) => p._id === postId)
    if (action === "pin") {
      return targetPost ? oldData : [handleSinglePost({ _id: postId }), ...oldData]
    }
    if (action === "unpin") {
      return oldData.filter((p) => p._id !== postId)
    }
  }

  return oldData
}

export const usePinPost = () => {
  const queryClient = useQueryClient()
  const { authUser } = useAuthUser()

  const {
    mutate: pinUnpinPost,
    isPending: isPinning,
    isError,
    error,
  } = useMutation({
    mutationFn: ({ postId, action }) => {
      if (action === "pin") {
        return pinUnpinPostApi(postId)
      }
      if (action === "unpin") {
        return unpinPostApi(postId)
      }
      throw new Error("Invalid action for pinUnpinPost")
    },

    onMutate: async ({ postId, action, post }) => {
      if (!authUser?.username) {
        console.warn("No authenticated user or username for optimistic pin update.")
        return
      }

      const optimisticPin = action === "unpin" ? postKeys.pinned(authUser.username) : ""

      const keysToUpdate = [
        optimisticPin,
        postKeys.details(postId),
        postKeys.all,
        postKeys.bookmarked(),
      ].filter((key) => queryClient.getQueryData(key) !== undefined)

      await Promise.all(keysToUpdate.map((key) => queryClient.cancelQueries({ queryKey: key })))

      const previousData = keysToUpdate.reduce((acc, key) => {
        acc[JSON.stringify(key)] = queryClient.getQueryData(key)
        return acc
      }, {})

      keysToUpdate.forEach((key) => {
        queryClient.setQueryData(key, (oldData) => updatePostPinStatus(oldData, postId, action))
      })

      const authUserKey = ["authUser"]
      queryClient.setQueryData(authUserKey, (oldData) => {
        if (!oldData) return oldData
        const newPinnedPostsIds = oldData.pinnedPosts || []
        if (action === "pin") {
          return { ...oldData, pinnedPosts: [postId, ...newPinnedPostsIds] }
        }
        return { ...oldData, pinnedPosts: newPinnedPostsIds.filter((id) => id !== postId) }
      })
      previousData[JSON.stringify(authUserKey)] = queryClient.getQueryData(authUserKey)

      // Return the snapshot for rollback in case of an error
      return { previousData }
    },

    onSuccess: (data) => {
      showAppToast(data.message, "success")
      // Invalidate all related post keys to ensure data consistency
      queryClient.invalidateQueries({ queryKey: postKeys.list() })
      queryClient.invalidateQueries({ queryKey: postKeys.details() })
      queryClient.invalidateQueries({ queryKey: postKeys.bookmarked() })
      queryClient.invalidateQueries({ queryKey: postKeys.likes() })

      // Invalidate the user's pinned posts and the auth user data
      // queryClient.invalidateQueries({ queryKey: postKeys.pinned(authUser.username) })
    },

    onError: (error, variables, context) => {
      showAppToast(error.message || "Failed to update pin status", "error")
      // Rollback all changes using the single snapshot
      if (context?.previousData) {
        Object.entries(context.previousData).forEach(([key, value]) => {
          queryClient.setQueryData(JSON.parse(key), value)
        })
      }
    },
  })

  return { pinUnpinPost, isPinning, isError, error }
}
