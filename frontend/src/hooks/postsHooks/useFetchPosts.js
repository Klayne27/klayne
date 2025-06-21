import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchPostsApi } from "../../api/postsApi";

export const useFetchPosts = (POST_ENDPOINT) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ["posts", POST_ENDPOINT],
    queryFn: ({ pageParam }) => fetchPostsApi(POST_ENDPOINT, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage?.hasNextPage ? allPages.length + 1 : undefined;
    },
    enabled: !!POST_ENDPOINT,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  });

  const posts = data?.pages.flatMap((page) => page?.posts || []) || [];

  return {
    posts,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError,
    error,
  };
};
