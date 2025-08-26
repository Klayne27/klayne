import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logoutApi } from "../../../api/authApi";
import { showAppToast } from "../../../utils/showAppToast";
import { userKeys } from "../../users/usersHooks/userKeys";

export const useLogout = () => {
  const queryClient = useQueryClient();

  const { mutate: logout } = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.auth() });
    },
    onError: () => {
      showAppToast("Logout failed", "error");
    },
  });

  return { logout };
};
