import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signupApi } from "../../api/authApi";
import toast from "react-hot-toast";
import { showAppToast } from "../../utils/showAppToast";

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
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
  });

  return { signup, isPending, isError, error };
};
