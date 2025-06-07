import { useQuery } from "@tanstack/react-query";
import { authUserApi } from "../../api/authHooks";


export const useAuthUser = () => {
  const { data: authUser, isLoading } = useQuery({
    queryKey: ["authUser"],
    queryFn: authUserApi,
    retry: false,
  });

  return { authUser, isLoading };
};
