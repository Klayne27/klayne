import { useQuery } from "@tanstack/react-query";
import { postKeys } from "./postKeys";
import { fetchScheduledPostsApi } from "../../../api/postsApi";

export const useGetScheduledPosts = () => {
  const {
    data: scheduledPosts,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: postKeys.list("scheduled"),
    queryFn: fetchScheduledPostsApi,
  });

  return { scheduledPosts, isLoading, isError, error, refetch };
};
