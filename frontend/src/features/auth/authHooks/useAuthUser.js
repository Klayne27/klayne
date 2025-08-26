import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userKeys } from "../../users/usersHooks/userKeys";
import { authUserApi } from "../../../api/authApi";

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
