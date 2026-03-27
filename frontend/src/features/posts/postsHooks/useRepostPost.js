import { useQueryClient, useMutation } from "@tanstack/react-query"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { postKeys } from "./postKeys"
import { showAppToast } from "../../../utils/showAppToast"

const updatePostRepostStatus = (oldData, postId, userId) => {
  if (!oldData) return oldData
  const handlePost = (post) => {
    if (!post) return post
    const targetPost = post.repostedFrom?._id === postId ? post.repostedFrom : post
    if (targetPost._id === postId) {
      const isReposted = targetPost.repostedBy?.includes(userId)
      const newRepostedBy = isReposted
        ? (targetPost.repostedBy || []).filter((id) => id !== userId)
        : [...(targetPost.repostedBy || []), userId]
      const update = { repostedBy: newRepostedBy, repostsCount: newRepostedBy.length }
      return post.repostedFrom?._id === postId
        ? { ...post, repostedFrom: { ...targetPost, ...update } }
        : { ...post, ...update }
    }
    return post
  }

  if (oldData.pages)
    return {
      ...oldData,
      pages: oldData.pages.map((p) => ({
        ...p,
        posts: p.posts?.map(handlePost),
        replies: p.replies?.map(handlePost),
      })),
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
      await queryClient.cancelQueries({ queryKey: postKeys.all })
      const allQueries = queryClient.getQueryCache().getAll()
      const previousData = {}

      allQueries.forEach((query) => {
        const key = query.queryKey
        if (Array.isArray(key) && key[0] === "posts") {
          previousData[JSON.stringify(key)] = queryClient.getQueryData(key)
          queryClient.setQueryData(key, (old) => updatePostRepostStatus(old, postId, authUser._id))
        }
      })
      return { previousData }
    },

    onSuccess: (data) => {
      // showAppToast(data.message || "Success!", "success")
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
