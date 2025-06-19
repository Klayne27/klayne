import { useQuery } from "@tanstack/react-query";
import { fetchUsersApi } from "../../api/usersApi";

export const useFetchUsers = (userId, queryKey, endpoint, type) => {
  const {
    data: users,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKey,
    queryFn: () => fetchUsersApi(endpoint, type),
    enabled: !!userId,
  });

  return { users, isLoading, error };
};
