import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginApi } from "../../../api/authApi";
import { showAppToast } from "../../../utils/showAppToast";
import { userKeys } from "../../../hooks/usersHooks/userKeys";

export const useLogin = () => {
  const queryClient = useQueryClient();

  const {
    mutate: login,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: (formData) => loginApi(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.auth() });
    },
    onError: (error) => {
      showAppToast(error.message || "Login failed", "error");
    },
  });

  return { login, isPending, isError, error };
};
