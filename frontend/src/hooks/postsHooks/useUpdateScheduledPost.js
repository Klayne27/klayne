import { useMutation, useQueryClient } from "@tanstack/react-query";
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
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to update scheduled post", "error");
    },
  });

  return { updateScheduledPost, isPending, isError, error };
};
