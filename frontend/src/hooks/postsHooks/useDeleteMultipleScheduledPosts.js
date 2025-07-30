import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteMultipleScheduledPostsApi } from "../../api/postsApi";
import { showAppToast } from "../../utils/showAppToast";

export const useDeleteMultipleScheduledPosts = () => {
  const queryClient = useQueryClient();

  const {
    mutate: deleteMultipleScheduledPosts,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: (postIds) => deleteMultipleScheduledPostsApi(postIds),

    onMutate: async (postIdsToDelete) => {
      await queryClient.cancelQueries({ queryKey: ["scheduledPosts"] });

      const previousScheduledPosts = queryClient.getQueryData(["scheduledPosts"]);

      queryClient.setQueryData(["scheduledPosts"], (oldPosts) =>
        oldPosts?.filter((post) => !postIdsToDelete.includes(post._id))
      );

      return { previousScheduledPosts };
    },

    onSuccess: (data) => {
      if (data.successfulDeletions > 0) {
        showAppToast(
          `${data.successfulDeletions} scheduled post(s) successfully removed!`,
          "success"
        );
      }
      if (data.failedDeletions > 0) {
        showAppToast(
          `${data.failedDeletions} scheduled post(s) could not be deleted.`,
          "error"
        );
      }
    },

    onError: (error, postIdsToDelete, context) => {
      showAppToast(
        error.message || "Failed to remove scheduled posts. Please try again.",
        "error"
      );

      if (context?.previousScheduledPosts) {
        queryClient.setQueryData(["scheduledPosts"], context.previousScheduledPosts);
      }
      queryClient.invalidateQueries({ queryKey: ["scheduledPosts"] });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduledPosts"] });
    },
  });

  return { deleteMultipleScheduledPosts, isPending, isError, error };
};
