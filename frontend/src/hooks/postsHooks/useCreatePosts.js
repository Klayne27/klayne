import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createPostApi } from "../../api/postsApi"
import { showAppToast } from "../../utils/showAppToast"
import { POSTS_QUERY_KEY, SCHEDULED_POSTS_QUERY_KEY } from "../../constants/queryKeys"

export const useCreatePosts = () => {
  const queryClient = useQueryClient()

  const {
    mutate: createPost,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: (newPostData) => createPostApi(newPostData),
    onSuccess: (data) => {
      if (data.isScheduled) {
        showAppToast(`Post scheduled for ${new Date(data.scheduledAt).toLocaleString()}`, "success")
        queryClient.invalidateQueries({ queryKey: SCHEDULED_POSTS_QUERY_KEY })
      } else {
        showAppToast("Post created successfully", "success")
        queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY })
      }
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to create post", "error")
    },
  })

  return { createPost, isPending, isError, error }
}
