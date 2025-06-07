import { useQuery } from "@tanstack/react-query";
import { fetchPostsApi } from "../../api/postsApi";

export const useFetchPosts = (POST_ENDPOINT) => {
  const {
    data: posts,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["posts"],
    queryFn: () => fetchPostsApi(POST_ENDPOINT),
    
  });

  return { posts, isLoading, refetch, isRefetching };
};
