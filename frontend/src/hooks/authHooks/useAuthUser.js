import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authUserApi } from "../../api/authApi";
import { userKeys } from "../usersHooks/userKeys";

export const useAuthUser = () => {
  const queryClient = useQueryClient()
  const {
    data: authUser,
    isLoading,
    refetch: refetchAuthUser,
  } = useQuery({
    queryKey: userKeys.auth(),
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
     queryClient.setQueryData(userKeys.auth(), userData)
   }

  return { authUser, isLoading, refetchAuthUser, setAuthUser }
};
