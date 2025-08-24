import { useQuery } from "@tanstack/react-query";
import { fetchPinnedPostsApi } from "../../api/postsApi";
import { postKeys } from "./postKeys";

export const useFetchPinnedPosts = (username) => {
  const {
    data: pinnedPosts,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: postKeys.pinned(username),
    queryFn: async () => fetchPinnedPostsApi(username),
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  return { pinnedPosts, isLoading, isError, error, refetch, isRefetching };
};
