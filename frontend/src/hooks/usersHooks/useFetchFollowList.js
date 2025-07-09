// hooks/usersHooks/useFetchFollowList.js
import { useQuery } from "@tanstack/react-query";
import { fetchUsersApi } from "../../api/usersApi";

export const useFetchFollowList = (userId, type) => {
  // 1. Determine the endpoint based on 'type'
  // Ensure userId is available before constructing the endpoint
  const endpoint = userId
    ? type === "following"
      ? `/api/users/following/${userId}`
      : `/api/users/followers/${userId}`
    : null; // If no userId, endpoint is null

  // 2. Determine the queryKey
  const queryKey = [`${type}List`, userId];

  // 3. Enable the query only if userId and a valid endpoint exist
  const enabled = !!userId && !!endpoint;

  const {
    data: users = [], // Renamed to avoid conflict with 'users' below
    isLoading,
    error,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: queryKey,
    // The queryFn now calls your single fetchUsersApi,
    // passing the dynamically determined endpoint and type.
    queryFn: async () => fetchUsersApi(endpoint, type),
    enabled: enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    // You might want to add retry logic here similar to useFetchUserProfile
    retry: (failureCount, err) => {
      // Example retry logic: if it's a 404 or 403, don't retry. Otherwise, retry a few times.
      if (err?.status === 403 || err?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Assume the API returns an object like { users: [...] }
  // We extract the 'users' array, defaulting to an empty array if not present.

  return { users, isLoading, error, isError, refetch, isRefetching };
};
