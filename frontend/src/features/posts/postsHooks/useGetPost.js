import { useQuery } from "@tanstack/react-query";
import { postKeys } from "./postKeys";
import { getPostApi } from "../../../api/postsApi";

export const useGetPost = (pid) => {
  const {
    data: post,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: postKeys.details(pid),
    queryFn: () => getPostApi(pid),
    enabled: !!pid,
    staleTime: 15 * 60 * 1000, 
  });

  return { post, isLoading, isError, error, refetch };
};
