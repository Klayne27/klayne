import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateUserProfileApi } from "../../api/usersApi";
import { useState } from "react";
import { showAppToast } from "../../utils/showAppToast";

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  const [newUsername, setNewUsername] = useState(null);

  const {
    mutateAsync: updateProfile,
    isPending: isUpdatingProfile,
    isSuccess,
    isError,
    error
  } = useMutation({
    mutationFn: (formData) => updateUserProfileApi(formData),
    onSuccess: (data) => {
      setNewUsername(data.username);

      showAppToast("Profile updated successfully", "success");
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["authUser"] }),
        queryClient.invalidateQueries({ queryKey: ["posts"] }),
        queryClient.invalidateQueries({ queryKey: ["userProfile", data.username] }),
      ]);
    },
    onError: (error) => {
      showAppToast(error.message, "error");
      setNewUsername(null);
    },
  });

  return { updateProfile, isUpdatingProfile, isSuccess, newUsername, error, isError };
};
