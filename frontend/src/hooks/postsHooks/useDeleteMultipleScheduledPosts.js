// hooks/postsHooks/useDeleteMultipleScheduledPosts.js (Create a new file for this)
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteMultipleScheduledPostsApi } from "../../api/postsApi";

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
        toast.success(
          `${data.successfulDeletions} scheduled post(s) deleted successfully.`
        );
      }
      if (data.failedDeletions > 0) {
        toast.error(`${data.failedDeletions} scheduled post(s) could not be deleted.`);
      }
      queryClient.invalidateQueries({ queryKey: ["scheduledPosts"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete scheduled posts.");
    },
  });

  return { deleteMultipleScheduledPosts, isPending, isError, error };
};
