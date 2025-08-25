import { useQuery } from "@tanstack/react-query";
import { fetchSuggestedUsersApi } from "../../api/usersApi";
import { userKeys } from "./userKeys";

export const useSuggestedUsers = () => {
  const {
    data: suggestedUsers,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: userKeys.suggestedList(),
    queryFn: fetchSuggestedUsersApi,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  

  return { suggestedUsers, isLoading, refetch, isRefetching };
};
