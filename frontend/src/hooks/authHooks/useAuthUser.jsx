import { useQuery } from "@tanstack/react-query";
import { authUserApi } from "../../api/authHooks";
import { useEffect } from "react";


export const useAuthUser = () => {
  const { data: authUser, isLoading, isError } = useQuery({
    queryKey: ["authUser"],
    queryFn: authUserApi,
    retry: false,
    staleTime: Infinity, // Or a very long time if you only want to refetch on app mount
    cacheTime: Infinity, // Keep data in cache unless explicitly invalidated
    refetchOnWindowFocus: false, // Don't refetch on tab refocus for initial auth check
    refetchOnMount: true, // Crucial: Refetch on mount to check session
  });

  useEffect(() => {
    if (isError && authUser !== null) {
      // authUser should be null if error occurred
      // This block might be for secondary error handling, main should be in queryFn
      console.warn("Auth user query is in error state. authUser:", authUser);
      // Trigger a logout or redirect if not already handled
    }
  }, [isError, authUser]);

  return { authUser, isLoading };
};
