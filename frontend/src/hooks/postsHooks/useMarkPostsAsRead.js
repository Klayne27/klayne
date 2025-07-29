import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markPostsAsReadApi } from "../../api/postsApi";

export const useMarkPostsAsRead = (setNewPostCount) => {
  const queryClient = useQueryClient();
  const { mutate: markFeedAsRead } = useMutation({
    mutationFn: markPostsAsReadApi,
    onSuccess: () => {
    //   queryClient.invalidateQueries({ queryKey: ["posts", "/api/posts/all"] }); // Invalidate feed posts
      //   showAppToast("Feed updated!", "success");
    //   setNewPostCount(0); // Immediately clear the local count
    },
    onError: (error) => {
      //   showAppToast(error.message || "Failed to mark feed as read.", "error");
    },
  });

  return { markFeedAsRead };
};
