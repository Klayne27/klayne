import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { likePostApi } from "../../../api/postsApi"
import { postKeys } from "./postKeys"
import { showAppToast } from "../../../utils/showAppToast"

const updatePostLikes = (oldData, postId, userId) => {
  if (!oldData) return oldData

  const handlePost = (post) => {
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

  if (oldData.pages) {
    const newPages = oldData.pages.map((page) => ({
      ...page,
      posts: (page.posts || []).map(handlePost),
    }))
    return { ...oldData, pages: newPages }
  }

  if (oldData._id) {
    return handlePost(oldData)
  }

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

      const keysToUpdate = [
        postKeys.list("/api/posts/all"),
        postKeys.list("/api/posts/following"),
        postKeys.bookmarked(),
        postKeys.pinned(username),
        postKeys.details(postId),
        postKeys.user(username),
        postKeys.likes(username),
      ].filter((key) => queryClient.getQueryData(key))

      await Promise.all(keysToUpdate.map((key) => queryClient.cancelQueries({ queryKey: key })))

      const previousData = keysToUpdate.reduce((acc, key) => {
        acc[JSON.stringify(key)] = queryClient.getQueryData(key)
        return acc
      }, {})

      keysToUpdate.forEach((key) => {
        queryClient.setQueryData(key, (oldData) => updatePostLikes(oldData, postId, authUser._id))
      })

      return { previousData }
    },

    onError: (error, postId, context) => {
      showAppToast(error.message || "Failed to like/unlike post.")

      if (context?.previousData) {
        Object.entries(context.previousData).forEach(([key, value]) => {
          queryClient.setQueryData(JSON.parse(key), value)
        })
      }
    },
  })

  return { likePost, isLiking }
}
