import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUserAccountApi } from "../../api/usersApi";
import { showAppToast } from "../../utils/showAppToast";

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: deleteAccount, isPending: isDeletingAccount } = useMutation({
    mutationFn: ({ userId, password }) => deleteUserAccountApi(userId, password),
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
