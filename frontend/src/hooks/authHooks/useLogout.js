import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logoutApi } from "../../api/authApi";
import { showAppToast } from "../../utils/showAppToast";
import { AUTH_USER_QUERY_KEY } from "../../constants/queryKeys";

export const useLogout = () => {
  const queryClient = useQueryClient();

  const { mutate: logout } = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY });
    },
    onError: () => {
      showAppToast("Logout failed", "error");
    },
  });

  return { logout };
};
