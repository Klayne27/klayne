import { useQuery } from "@tanstack/react-query";
import { searchUsersApi } from "../../api/usersApi";

export const useSearchUsers = (query) => {
  const {
    data: users,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery({
    queryKey: ["searchUsers", query],
    queryFn: () => searchUsersApi(query),
    enabled: !!query,
  });

  return { users, isLoading, isError, error, isFetching };
};
