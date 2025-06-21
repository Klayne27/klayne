import { useQuery } from "@tanstack/react-query";
import { fetchSuggestedUsersApi } from "../../api/usersApi";

export const useSuggestedUsers = () => {
  const {
    data: suggestedUsers,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["suggestedUsers"],
    queryFn: fetchSuggestedUsersApi,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  

  return { suggestedUsers, isLoading, refetch, isRefetching };
};
