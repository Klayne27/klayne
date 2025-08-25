import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signupApi } from "../../api/authApi";
import { showAppToast } from "../../utils/showAppToast";
import { userKeys } from "../usersHooks/userKeys";

export const useSignup = (formData) => {
  const queryClient = useQueryClient();

  const {
    mutate: signup,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: () => signupApi(formData),
    onSuccess: () => {
      showAppToast("Signup successful! Welcome to X-ayne!", "success");
      queryClient.invalidateQueries({ queryKey: userKeys.auth() });
    },
  });

  return { signup, isPending, isError, error };
};
