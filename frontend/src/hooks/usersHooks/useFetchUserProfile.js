import { useQuery } from "@tanstack/react-query";
import { fetchUserPofileApi } from "../../api/usersApi";

export const useFetchUserProfile = (username) => {
  const { data, isLoading, isRefetching, error, isError, refetch } = useQuery({
    queryKey: ["userProfile", username],
    queryFn: async () => {
      const result = await fetchUserPofileApi(username);
      return result;
    },
    retry: (failureCount, error) => {
      if (error?.status === 403 || error?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
    staleTime: 0,
    cacheTime: 10 * 60 * 1000,
  });

  const user = data?.user || null;
  const isBlockedByYou = data?.isBlockedByYou || false;
  const hasBlockedYou = data?.hasBlockedYou || false;
  const message = data?.message || error?.message || null;
  const httpStatus = data?.status || error?.status || null;


  return {
    user,
    isLoading,
    isRefetching,
    error: message,
    isError,
    refetch,
    isBlockedByYou,
    hasBlockedYou,
    httpStatus,
  };
};
