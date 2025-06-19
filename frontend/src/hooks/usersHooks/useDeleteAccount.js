import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteUserAccountApi } from "../../api/usersApi";

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: deleteAccount, isPending: isDeletingAccount } = useMutation({
    mutationFn: deleteUserAccountApi,
    onSuccess: () => {
      toast.success("Account deleted successfully!");
      localStorage.removeItem("authUser");
      queryClient.removeQueries();
      window.location.href = "/login";
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete account.");
    },
  });

  return { deleteAccount, isDeletingAccount };
};
