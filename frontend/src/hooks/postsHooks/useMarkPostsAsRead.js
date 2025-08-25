import { useMutation } from "@tanstack/react-query";
import { markPostsAsReadApi } from "../../api/postsApi";

export const useMarkPostsAsRead = () => {
  const { mutate: markFeedAsRead } = useMutation({
    mutationFn: markPostsAsReadApi,
  });

  return { markFeedAsRead };
};
