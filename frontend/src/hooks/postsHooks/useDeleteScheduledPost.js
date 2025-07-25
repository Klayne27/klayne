import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteScheduledPostApi } from "../../api/postsApi";
import toast from "react-hot-toast";
import { showAppToast } from "../../utils/showAppToast";

// New React Query hook for deleting scheduled posts
export const useDeleteScheduledPost = () => {
  const queryClient = useQueryClient();

  const {
    mutate: deleteScheduledPost,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: (postId) => deleteScheduledPostApi(postId),
    onSuccess: () => {
      showAppToast("Scheduled post deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["scheduledPosts"] });
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to delete scheduled post", "error");
    },
  });

  return { deleteScheduledPost, isPending, isError, error };
};
