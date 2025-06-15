import { useQuery } from "@tanstack/react-query";
import { authUserApi } from "../../api/authHooks";

export const useAuthUser = () => {
  const { data: authUser, isLoading } = useQuery({
    queryKey: ["authUser"],
    queryFn: authUserApi,
    retry: false,
    staleTime: Infinity, // Or a very long time if you only want to refetch on app mount
    cacheTime: Infinity, // Keep data in cache unless explicitly invalidated
    refetchOnWindowFocus: false, // Don't refetch on tab refocus for initial auth check
    refetchOnMount: true, // Crucial: Refetch on mount to check session
  });

  return { authUser, isLoading };
};
