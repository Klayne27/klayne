import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateUserProfileApi } from "../../api/usersApi";
import { useState } from "react";

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  const [newUsername, setNewUsername] = useState(null); 

  const {
    mutateAsync: updateProfile,
    isPending: isUpdatingProfile,
    isSuccess,
  } = useMutation({
    mutationFn: (formData) => updateUserProfileApi(formData),
    onSuccess: (data) => {
      setNewUsername(data.username);

      toast.success("Profile updated successfully");
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["authUser"] }),

        queryClient.invalidateQueries({ queryKey: ["userProfile", data.username] }),
      ]);
    },
    onError: (error) => {
      toast.error(error.message);
      setNewUsername(null); 
    },
  });

  return { updateProfile, isUpdatingProfile, isSuccess, newUsername };
};
