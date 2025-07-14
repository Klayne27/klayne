import { useQuery } from "@tanstack/react-query";
import { fetchScheduledPostsApi } from "../../api/postsApi";

// New React Query hook for fetching scheduled posts
export const useGetScheduledPosts = () => {
  const {
    data: scheduledPosts,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["scheduledPosts"],
    queryFn: fetchScheduledPostsApi,
  });

  return { scheduledPosts, isLoading, isError, error, refetch };
};
