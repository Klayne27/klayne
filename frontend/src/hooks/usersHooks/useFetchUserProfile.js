import { useQuery } from "@tanstack/react-query";
import { fetchUserPofileApi } from "../../api/usersApi";

export const useFetchUserProfile = (username) => {
  const {
    data: user,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["userProfile", username],
    queryFn: () => fetchUserPofileApi(username),
  });

  return { user, isLoading, refetch, isRefetching };
};
