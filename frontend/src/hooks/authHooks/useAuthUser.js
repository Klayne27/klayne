import { useQuery } from "@tanstack/react-query";
import { authUserApi } from "../../api/authApi";

export const useAuthUser = () => {

  const {
    data: authUser,
    isLoading,
    refetch: refetchAuthUser,
  } = useQuery({
    queryKey: ["authUser"],
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

  return { authUser, isLoading, refetchAuthUser };
};
