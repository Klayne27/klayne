import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteMultipleScheduledPostsApi } from "../../api/postsApi"
import { showAppToast } from "../../utils/showAppToast"
import { SCHEDULED_POSTS_QUERY_KEY } from "../../constants/queryKeys"

export const useDeleteMultipleScheduledPosts = () => {
  const queryClient = useQueryClient()

  const {
    mutate: deleteMultipleScheduledPosts,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: (postIds) => deleteMultipleScheduledPostsApi(postIds),

    onMutate: async (postIdsToDelete) => {
      await queryClient.cancelQueries({ queryKey: SCHEDULED_POSTS_QUERY_KEY })

      const previousScheduledPosts = queryClient.getQueryData(SCHEDULED_POSTS_QUERY_KEY)

      queryClient.setQueryData(SCHEDULED_POSTS_QUERY_KEY, (oldPosts) =>
        oldPosts?.filter((post) => !postIdsToDelete.includes(post._id)),
      )

      return { previousScheduledPosts }
    },

    onSuccess: (data) => {
      if (data.successfulDeletions > 0) {
        showAppToast(
          `${data.successfulDeletions} scheduled post(s) successfully removed!`,
          "success",
        )
      }
    },

    onError: (error, postIdsToDelete, context) => {
      showAppToast(error.message || "Failed to remove scheduled posts. Please try again.", "error")

      queryClient.setQueryData(SCHEDULED_POSTS_QUERY_KEY, context.previousScheduledPosts)
      queryClient.invalidateQueries({ queryKey: SCHEDULED_POSTS_QUERY_KEY })
    },
  })

  return { deleteMultipleScheduledPosts, isPending, isError, error }
}
