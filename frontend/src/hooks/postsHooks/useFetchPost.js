import { useQuery } from "@tanstack/react-query";
import { fetchPostApi } from "../../api/postsApi";

export const useFetchPost = (pid) => {
  const {
    data: post,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["post", pid],
    queryFn: () => fetchPostApi(pid),
    enabled: !!pid, // Only fetch if pid is available
  });

  return { post, isLoading, isError, error };
};
