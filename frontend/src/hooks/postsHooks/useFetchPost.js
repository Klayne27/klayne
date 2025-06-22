import { useQuery } from "@tanstack/react-query";
import { fetchPostApi } from "../../api/postsApi";

export const useFetchPost = (pid) => {
  const {
    data: post,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ["post", pid],
    queryFn: () => fetchPostApi(pid),
    enabled: !!pid,
    staleTime: 0, 
  });

  return { post, isLoading, isError, error, refetch };
};
