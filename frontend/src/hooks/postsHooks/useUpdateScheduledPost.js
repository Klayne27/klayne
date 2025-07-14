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
      // If the post is no longer scheduled (i.e., published immediately),
      // you might want to invalidate the 'posts' query too.
      // This logic would be better handled based on the response from the API.
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update scheduled post");
    },
  });

  return { updateScheduledPost, isPending, isError, error };
};
