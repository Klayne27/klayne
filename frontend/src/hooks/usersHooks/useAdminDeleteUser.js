import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUserAccountAdmin } from "../../api/usersApi";
import { useNavigate } from "react-router-dom";
import { showAppToast } from "../../utils/showAppToast";
import { userKeys } from "./userKeys";

export const useAdminDeleteUser = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    mutate: adminDeleteUser,
    isPending,
    isSuccess,
    isError,
    error,
  } = useMutation({
    mutationFn: deleteUserAccountAdmin,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userKeys.profiles() });
      showAppToast(data.message || "User account deleted successfully!", "success");
      navigate("/");
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to delete user account.", "error");
      console.error("Error deleting user account (admin):", error);
    },
  });

  return { adminDeleteUser, isPending, isSuccess, isError, error };
};
