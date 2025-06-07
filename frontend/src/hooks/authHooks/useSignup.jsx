import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signupApi } from "../../api/authHooks";
import toast from "react-hot-toast";

export const useSignup = (email, username, fullName, password) => {
  const queryClient = useQueryClient();

  const {
    mutate: signup,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: () => signupApi(email, username, fullName, password),
    onSuccess: () => {
      toast.success("Signup successful! Welcome to X-ayne!");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
  });

  return { signup, isPending, isError, error };
};
