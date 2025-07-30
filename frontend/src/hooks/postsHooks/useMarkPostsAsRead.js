import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markPostsAsReadApi } from "../../api/postsApi";

export const useMarkPostsAsRead = () => {
  const queryClient = useQueryClient();
  const { mutate: markFeedAsRead } = useMutation({
    mutationFn: markPostsAsReadApi,
    onSuccess: () => {
    //   queryClient.invalidateQueries({ queryKey: ["posts", "/api/posts/all"] }); // Invalidate feed posts
      //   showAppToast("Feed updated!", "success");
    },
  });

  return { markFeedAsRead };
};
