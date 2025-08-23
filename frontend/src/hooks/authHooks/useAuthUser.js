import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authUserApi } from "../../api/authApi";
import { AUTH_USER_QUERY_KEY } from "../../constants/queryKeys";

export const useAuthUser = () => {
  const queryClient = useQueryClient()
  const {
    data: authUser,
    isLoading,
    refetch: refetchAuthUser,
  } = useQuery({
    queryKey: AUTH_USER_QUERY_KEY,
    queryFn: async () => {
      const data = await authUserApi();
      return data;
    },
    retry: false,
    staleTime: Infinity,
    cacheTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

   const setAuthUser = (userData) => {
     queryClient.setQueryData(AUTH_USER_QUERY_KEY, userData)
   }

  return { authUser, isLoading, refetchAuthUser, setAuthUser }
};
