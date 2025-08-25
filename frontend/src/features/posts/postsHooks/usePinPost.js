import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { pinUnpinPostApi, unpinPostApi } from "../../../api/postsApi"
import { postKeys } from "./postKeys"
import { userKeys } from "../../../hooks/usersHooks/userKeys"
import { showAppToast } from "../../../utils/showAppToast"


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

  if (oldData.pages) {
    const newPages = oldData.pages.map((page) => ({
      ...page,
      posts: (page.posts || []).map(handleSinglePost),
    }))
    return { ...oldData, pages: newPages }
  }

  if (oldData._id) {
    return handleSinglePost(oldData)
  }

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

      const authUserKey = userKeys.auth()
      queryClient.setQueryData(authUserKey, (oldData) => {
        if (!oldData) return oldData
        const newPinnedPostsIds = oldData.pinnedPosts || []
        if (action === "pin") {
          return { ...oldData, pinnedPosts: [postId, ...newPinnedPostsIds] }
        }
        return { ...oldData, pinnedPosts: newPinnedPostsIds.filter((id) => id !== postId) }
      })
      previousData[JSON.stringify(authUserKey)] = queryClient.getQueryData(authUserKey)

      return { previousData }
    },

    onSuccess: (data) => {
      showAppToast(data.message, "success")
      queryClient.invalidateQueries({ queryKey: postKeys.list() })
      queryClient.invalidateQueries({ queryKey: postKeys.details() })
      queryClient.invalidateQueries({ queryKey: postKeys.bookmarked() })
      queryClient.invalidateQueries({ queryKey: postKeys.likes() })
    },

    onError: (error, variables, context) => {
      showAppToast(error.message || "Failed to update pin status", "error")
      if (context?.previousData) {
        Object.entries(context.previousData).forEach(([key, value]) => {
          queryClient.setQueryData(JSON.parse(key), value)
        })
      }
    },
  })

  return { pinUnpinPost, isPinning, isError, error }
}
