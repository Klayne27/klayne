import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { loginApi } from "../../api/authHooks";

export const useLogin = (username, password) => {
  const queryClient = useQueryClient();

  const {
    mutate: login,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: () => loginApi(username, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
    onError: (error) => {
      toast.error(error.message || "Login failed");
    },
  });

  return { login, isPending, isError, error };
};
