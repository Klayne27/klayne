import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteScheduledPostApi } from "../../api/postsApi";
import toast from "react-hot-toast";

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
      toast.success("Scheduled post deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["scheduledPosts"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete scheduled post");
    },
  });

  return { deleteScheduledPost, isPending, isError, error };
};
