import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateUserProfileApi } from "../../api/usersApi";
import { useState } from "react";
import { showAppToast } from "../../utils/showAppToast";
import { postKeys } from "../postsHooks/postKeys";
import { AUTH_USER_QUERY_KEY } from "../../constants/queryKeys";

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
        queryClient.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: postKeys.all }),
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
