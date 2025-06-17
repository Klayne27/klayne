import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { loginApi } from "../../api/authApi";

export const useLogin = (formData) => {
  const queryClient = useQueryClient();

  const {
    mutate: login,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: () => loginApi(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
    onError: (error) => {
      toast.error(error.message || "Login failed");
    },
  });

  return { login, isPending, isError, error };
};
