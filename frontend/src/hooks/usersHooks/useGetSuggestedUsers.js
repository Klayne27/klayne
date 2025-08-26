import { useQuery } from "@tanstack/react-query";
import { getSuggestedUsersApi } from "../../api/usersApi";
import { userKeys } from "./userKeys";

export const useGetSuggestedUsers = () => {
  const {
    data: suggestedUsers,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: userKeys.suggestedList(),
    queryFn: getSuggestedUsersApi,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  

  return { suggestedUsers, isLoading, refetch, isRefetching };
};
