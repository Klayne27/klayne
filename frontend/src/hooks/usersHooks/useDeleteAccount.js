import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteUserAccountApi } from "../../api/usersApi";

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: deleteAccount, isPending: isDeletingAccount } = useMutation({
    mutationFn: deleteUserAccountApi,
    onSuccess: () => {
      toast.success("Account deleted successfully!");
      localStorage.removeItem("authUser"); // Remove user from local storage
      queryClient.removeQueries(); // Invalidate and remove all queries from cache
      window.location.href = "/login"; // Redirect to login page or home page
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete account.");
    },
  });

  return { deleteAccount, isDeletingAccount };
};
