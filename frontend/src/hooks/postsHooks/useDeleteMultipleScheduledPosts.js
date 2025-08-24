import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteMultipleScheduledPostsApi } from "../../api/postsApi"
import { showAppToast } from "../../utils/showAppToast"
import { postKeys } from "./postKeys"

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
      await queryClient.cancelQueries({ queryKey: postKeys.list("scheduled") })

      const previousScheduledPosts = queryClient.getQueryData(postKeys.list("scheduled"))

      queryClient.setQueryData(postKeys.list("scheduled"), (oldPosts) =>
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

      queryClient.setQueryData(postKeys.list("scheduled"), context.previousScheduledPosts)
      queryClient.invalidateQueries({ queryKey: postKeys.list("scheduled") })
    },
  })

  return { deleteMultipleScheduledPosts, isPending, isError, error }
}
