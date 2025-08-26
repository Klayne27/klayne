import { useQuery } from "@tanstack/react-query";
import { postKeys } from "./postKeys";
import { getScheduledPostsApi } from "../../../api/postsApi";

export const useGetScheduledPosts = () => {
  const {
    data: scheduledPosts,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: postKeys.list("scheduled"),
    queryFn: getScheduledPostsApi,
  });

  return { scheduledPosts, isLoading, isError, error, refetch };
};
