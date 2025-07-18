// src/hooks/usersHooks/useAdminDeleteUser.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUserAccountAdmin } from "../../api/usersApi"; // Adjust path if needed
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

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
      toast.success(data.message || "User account deleted successfully!");
      // Invalidate relevant queries to refresh data after deletion
      queryClient.invalidateQueries({ queryKey: ["users"] }); // Invalidate general user list
      queryClient.invalidateQueries({ queryKey: ["userProfile"] }); // Invalidate specific profile if it was cached
      // Optionally, redirect the admin away from the deleted user's profile
      navigate("/"); // Redirect to home or admin dashboard
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete user account.");
      console.error("Error deleting user account (admin):", error);
    },
  });

  return { adminDeleteUser, isPending, isSuccess, isError, error };
};
