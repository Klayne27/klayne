// hooks/postsHooks/useUpdateScheduledPost.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateScheduledPostApi } from "../../api/postsApi";

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
      toast.success("Scheduled post updated successfully");
      queryClient.invalidateQueries({ queryKey: ["scheduledPosts"] });
      // If the post is published immediately, you'd invalidate 'posts' query,
      // but that's handled by the createPost -> deleteScheduledPost flow.
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update scheduled post");
    },
  });

  return { updateScheduledPost, isPending, isError, error };
};
