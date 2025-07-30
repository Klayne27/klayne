import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUserAccountAdmin } from "../../api/usersApi";
import { useNavigate } from "react-router-dom";
import { showAppToast } from "../../utils/showAppToast";

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
      showAppToast(data.message || "User account deleted successfully!", "success");
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      navigate("/");
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to delete user account.", "error");
      console.error("Error deleting user account (admin):", error);
    },
  });

  return { adminDeleteUser, isPending, isSuccess, isError, error };
};
