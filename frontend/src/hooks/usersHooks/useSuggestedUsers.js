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
  });

  return { suggestedUsers, isLoading, refetch, isRefetching };
};
