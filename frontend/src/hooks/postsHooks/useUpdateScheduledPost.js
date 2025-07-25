// hooks/postsHooks/useUpdateScheduledPost.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateScheduledPostApi } from "../../api/postsApi";
import { showAppToast } from "../../utils/showAppToast";

export const useUpdateScheduledPost = () => {
  const queryClient = useQueryClient();

  const {
    mutate: updateScheduledPost,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: ({ postId, postData }) => updateScheduledPostApi({ postId, postData }),
    onSuccess: () => {
      showAppToast("Scheduled post updated successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["scheduledPosts"] });
      // If the post is published immediately, you'd invalidate 'posts' query,
      // but that's handled by the createPost -> deleteScheduledPost flow.
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to update scheduled post", "error");
    },
  });

  return { updateScheduledPost, isPending, isError, error };
};
