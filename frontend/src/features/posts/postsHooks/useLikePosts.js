import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { likePostApi } from "../../../api/postsApi"
import { postKeys } from "./postKeys"
import { showAppToast } from "../../../utils/showAppToast"

const updatePostLikes = (oldData, postId, userId) => {
  if (!oldData) return oldData

  const handlePost = (post) => {
    if (!post) return post
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

  // 1. Handle Infinite Query Pages (Main feeds / Replies)
  if (oldData.pages) {
    const newPages = oldData.pages.map((page) => ({
      ...page,
      posts: page.posts ? page.posts.map(handlePost) : undefined,
      replies: page.replies ? page.replies.map(handlePost) : undefined,
    }))
    return { ...oldData, pages: newPages }
  }

  // 2. NEW: Handle Thread Object (Ancestors and the Hero Post)
  // This matches the structure returned by useGetPostThread
  if (oldData.ancestors || oldData.post) {
    return {
      ...oldData,
      post: oldData.post ? handlePost(oldData.post) : oldData.post,
      ancestors: oldData.ancestors ? oldData.ancestors.map(handlePost) : oldData.ancestors,
    }
  }

  // 3. Handle single post (details)
  if (oldData._id) return handlePost(oldData)

  // 4. Handle simple arrays (if any exist)
  if (Array.isArray(oldData)) return oldData.map(handlePost)

  return oldData
}

export const useLikePost = (username = null) => {
  const queryClient = useQueryClient()
  const { authUser } = useAuthUser()

  const { mutate: likePost, isPending: isLiking } = useMutation({
    mutationFn: (postId) => likePostApi(postId),

    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: postKeys.all })

      // 2. Get all keys currently in the cache
      const allActiveQueries = queryClient.getQueryCache().getAll()

      const previousData = {}

      // 3. Iterate through every cached query
      allActiveQueries.forEach((query) => {
        const key = query.queryKey

        // Check if this query is a "posts" related query
        if (Array.isArray(key) && key[0] === "posts") {
          const data = queryClient.getQueryData(key)

          // Save for rollback
          previousData[JSON.stringify(key)] = data

          // 4. Perform the update
          queryClient.setQueryData(key, (oldData) => updatePostLikes(oldData, postId, authUser._id))
        }
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
