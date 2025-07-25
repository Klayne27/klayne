// hooks/postsHooks/useDeleteMultipleScheduledPosts.js (Create a new file for this)
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
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
    onSuccess: (data) => {
      if (data.successfulDeletions > 0) {
        showAppToast(
          `${data.successfulDeletions} scheduled post(s) deleted successfully.`,
          "success"
        );
      }
      if (data.failedDeletions > 0) {
        showAppToast(`${data.failedDeletions} scheduled post(s) could not be deleted.`, "error");
      }
      queryClient.invalidateQueries({ queryKey: ["scheduledPosts"] });
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to delete scheduled posts.", "error");
    },
  });

  return { deleteMultipleScheduledPosts, isPending, isError, error };
};
