import { useQuery } from "@tanstack/react-query";
import { fetchScheduledPostsApi } from "../../api/postsApi";
import { postKeys } from "./postKeys";

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
