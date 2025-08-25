import { useQuery } from "@tanstack/react-query";
import { postKeys } from "./postKeys";
import { fetchPostApi } from "../../../api/postsApi";

export const useFetchPost = (pid) => {
  const {
    data: post,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: postKeys.details(pid),
    queryFn: () => fetchPostApi(pid),
    enabled: !!pid,
    staleTime: 15 * 60 * 1000, 
  });

  return { post, isLoading, isError, error, refetch };
};
