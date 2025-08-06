import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logoutApi } from "../../api/authApi";
import { showAppToast } from "../../utils/showAppToast";

export const useLogout = () => {
  const queryClient = useQueryClient();

  const { mutate: logout } = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
    onError: () => {
      showAppToast("Logout failed", "error");
    },
  });

  return { logout };
};
