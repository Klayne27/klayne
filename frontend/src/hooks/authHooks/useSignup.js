import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signupApi } from "../../api/authApi";
import toast from "react-hot-toast";
import { showAppToast } from "../../utils/showAppToast";
import { AUTH_USER_QUERY_KEY } from "../../constants/queryKeys";

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
      queryClient.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY });
    },
  });

  return { signup, isPending, isError, error };
};
