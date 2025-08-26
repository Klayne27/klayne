import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUserProfileApi } from "../../../api/usersApi";
import { useState } from "react";
import { userKeys } from "./userKeys";
import { showAppToast } from "../../../utils/showAppToast";
import { postKeys } from "../../posts/postsHooks/postKeys";

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
        queryClient.invalidateQueries({ queryKey: userKeys.auth() }),
        queryClient.invalidateQueries({ queryKey: postKeys.all }),
        queryClient.invalidateQueries({ queryKey: userKeys.profile(data.username) }),
      ]);
    },
    onError: (error) => {
      showAppToast(error.message, "error");
      setNewUsername(null);
    },
  });

  return { updateProfile, isUpdatingProfile, isSuccess, newUsername, error, isError };
};
