import { useQuery } from "@tanstack/react-query";
import { searchUsersApi } from "../../api/usersApi";

export const useSearchUsers = (query) => {
  const {
    data: suggestedUsers,
    isLoading: isLoadingSuggestedUsers,
    isError,
    error,
    isFetching,
  } = useQuery({
    queryKey: ["searchUsers", query],
    queryFn: () => searchUsersApi(query),
    enabled: !!query,
  });

  return { suggestedUsers, isLoadingSuggestedUsers, isError, error, isFetching };
};
