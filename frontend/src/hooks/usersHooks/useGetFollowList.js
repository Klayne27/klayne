import { useQuery } from "@tanstack/react-query";
import { getUsersApi } from "../../api/usersApi";
import { userKeys } from "./userKeys";

export const useGetFollowList = (userId, type) => {
  const endpoint = userId
    ? type === "following"
      ? `/api/users/following/${userId}`
      : `/api/users/followers/${userId}`
    : null;

  const enabled = !!userId && !!endpoint;

  const {
    data: users = [],
    isLoading,
    error,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: userKeys.followList(type, userId),
    queryFn: async () => getUsersApi(endpoint, type),
    enabled: enabled,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: (failureCount, err) => {
      if (err?.status === 403 || err?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });

  return { users, isLoading, error, isError, refetch, isRefetching };
};
