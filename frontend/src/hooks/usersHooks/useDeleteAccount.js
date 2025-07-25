import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteUserAccountApi } from "../../api/usersApi";
import { showAppToast } from "../../utils/showAppToast";

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: deleteAccount, isPending: isDeletingAccount } = useMutation({
    mutationFn: deleteUserAccountApi,
    onSuccess: () => {
      showAppToast("Account deleted successfully!", "success");
      localStorage.removeItem("authUser");
      queryClient.removeQueries();
      window.location.href = "/login";
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to delete account.", "error");
    },
  });

  return { deleteAccount, isDeletingAccount };
};
