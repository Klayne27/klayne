import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useLocation, useNavigate } from "react-router-dom"
import { deletePostApi } from "../../../api/postsApi"
import { postKeys } from "./postKeys"
import { showAppToast } from "../../../utils/showAppToast"

export const useDeletePosts = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const { mutate: deletePost, isPending: isDeleting } = useMutation({
    mutationFn: (postId) => deletePostApi(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: postKeys.all })

      const previousPosts = queryClient.getQueryData(postKeys.all)

      queryClient.setQueriesData({ queryKey: postKeys.all }, (oldData) => {
        if (!oldData) return oldData

        // Infinite query (feeds, user posts, etc.)
        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              posts: page.posts?.filter((p) => (p._id || p.id) !== postId),
              // Some pages might store replies at the page level too
              replies: page.replies?.filter((p) => (p._id || p.id) !== postId),
            })),
          }
        }

        // Reply list shape: { replies, hasNextPage, totalReplies }
        // This is what postKeys.replies(postId) returns
        if (oldData.replies && Array.isArray(oldData.replies)) {
          return {
            ...oldData,
            replies: oldData.replies.filter((p) => (p._id || p.id) !== postId),
            totalReplies: Math.max(0, (oldData.totalReplies ?? 0) - 1),
          }
        }

        // Bare array (e.g. bookmarks, likes)
        if (Array.isArray(oldData)) {
          return oldData.filter((p) => (p._id || p.id) !== postId)
        }

        return oldData
      })

      return { previousPosts }
    },
    onSuccess: (data, postId) => {
      showAppToast("Post deleted successfully", "success")

      queryClient.invalidateQueries({ queryKey: postKeys.all })

      if (data?.parentPostId) {
        queryClient.invalidateQueries({ queryKey: postKeys.details(data.parentPostId) })
        queryClient.invalidateQueries({ queryKey: postKeys.replies(data.parentPostId) })
      }

      if (!data.parentPostId && pathname.includes("/post/")) {
        navigate(-1)
      }
    },
    onError: () => {
      showAppToast("Failed to delete post", "error")
    },
  })

  return { deletePost, isDeleting }
}
