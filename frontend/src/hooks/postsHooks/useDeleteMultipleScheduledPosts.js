// hooks/postsHooks/useDeleteMultipleScheduledPosts.js
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

    // The heart of the optimistic update: Instant UI feedback!
    onMutate: async (postIdsToDelete) => {
      // 1. Halt any ongoing fetches for scheduled posts to prevent overwrites
      await queryClient.cancelQueries({ queryKey: ["scheduledPosts"] });

      // 2. Capture the current state of scheduled posts as a fallback
      const previousScheduledPosts = queryClient.getQueryData(["scheduledPosts"]);

      // 3. Optimistically remove the posts from the UI
      queryClient.setQueryData(["scheduledPosts"], (oldPosts) =>
        oldPosts?.filter((post) => !postIdsToDelete.includes(post._id))
      );

      // Return a context object holding our snapshot, crucial for rollback
      return { previousScheduledPosts };
    },

    onSuccess: (data) => {
      // Success! Our optimistic update was validated by the server.
      if (data.successfulDeletions > 0) {
        showAppToast(
          `${data.successfulDeletions} scheduled post(s) successfully removed!`,
          "success"
        );
      }
      // Inform about any partial failures, if applicable
      if (data.failedDeletions > 0) {
        showAppToast(
          `${data.failedDeletions} scheduled post(s) could not be deleted.`,
          "error"
        );
      }
      // No need to manually invalidate "scheduledPosts" here, as onSettled will handle it
    },

    onError: (error, postIdsToDelete, context) => {
      // Oh no! The deletion failed. Time to gracefully revert the UI.
      showAppToast(
        error.message || "Failed to remove scheduled posts. Please try again.",
        "error"
      );

      // Roll back the UI using our stored snapshot
      if (context?.previousScheduledPosts) {
        queryClient.setQueryData(["scheduledPosts"], context.previousScheduledPosts);
      }
      // Re-fetch to ensure the UI is fully synchronized with the server's truth
      queryClient.invalidateQueries({ queryKey: ["scheduledPosts"] });
    },

    onSettled: () => {
      // Regardless of success or failure, ensure our UI eventually matches the server's data.
      // This is a robust final synchronization step.
      queryClient.invalidateQueries({ queryKey: ["scheduledPosts"] });
    },
  });

  return { deleteMultipleScheduledPosts, isPending, isError, error };
};
