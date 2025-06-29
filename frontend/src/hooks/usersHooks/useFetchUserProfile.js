// hooks/usersHooks/useFetchUserProfile.js

import { useQuery } from "@tanstack/react-query";
import { fetchUserPofileApi } from "../../api/usersApi"; // Make sure path is correct

export const useFetchUserProfile = (username) => {
  const { data, isLoading, isRefetching, error, isError, refetch } = useQuery({
    queryKey: ["userProfile", username],
    queryFn: async () => {
      const result = await fetchUserPofileApi(username);
      return result; // Return the structured result
    },
    // IMPORTANT: Prevent retries on 403 or 404
    retry: (failureCount, error) => {
      // If the error object (from fetchUserPofileApi's throw) has a specific status
      if (error?.status === 403 || error?.status === 404) {
        return false; // Do not retry
      }
      // For other errors, retry up to 3 times
      return failureCount < 3;
    },
    // Use 'staleTime' for caching. Adjust as needed.
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Extract the specific data we need from the 'data' object
  // This allows `user` to be null, while `hasBlockedYou` can still be true.
  const user = data?.user || null;
  const isBlockedByYou = data?.isBlockedByYou || false;
  const hasBlockedYou = data?.hasBlockedYou || false;
  const message = data?.message || error?.message || null; // Prioritize structured message, then React Query error message
  const httpStatus = data?.status || error?.status || null; // Capture the HTTP status

  return {
    user,
    isLoading,
    isRefetching,
    error: message, // Provide the specific message
    isError,
    refetch,
    isBlockedByYou, // Expose these flags directly from the hook
    hasBlockedYou,
    httpStatus, // Expose the HTTP status for more specific handling
  };
};
