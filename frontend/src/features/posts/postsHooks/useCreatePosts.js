import { useMutation, useQueryClient } from "@tanstack/react-query"
import { postKeys } from "./postKeys"
import { createPostApi } from "../../../api/postsApi"
import { showAppToast } from "../../../utils/showAppToast"

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
        queryClient.invalidateQueries({ queryKey: postKeys.list("scheduled") })
      } else {
        showAppToast("Post created successfully", "success")
        queryClient.invalidateQueries({ queryKey: postKeys.list("/api/posts/all") })
        queryClient.invalidateQueries({ queryKey: postKeys.list("/api/posts/following") })
      }
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to create post", "error")
    },
  })

  return { createPost, isPending, isError, error }
}
