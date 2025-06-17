import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { followApi } from "../../api/usersApi";
import { useAuthUser } from "../authHooks/useAuthUser";

const useFollow = () => {
  const queryClient = useQueryClient();
  const { refetchAuthUser } = useAuthUser();

  const { mutate: follow, isPending } = useMutation({
    mutationFn: (userIdToFollow) => followApi(userIdToFollow),
    onSuccess: (data, userIdToFollow) => {
      refetchAuthUser();
      queryClient.setQueryData(["suggestedUsers"], (oldSuggestedUsers) => {
        if (!oldSuggestedUsers) return [];

        return oldSuggestedUsers.map((user) => {
          if (user._id === userIdToFollow) {
            return {
              ...user,
            };
          }
          return user;
        });
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to perform action");
    },
  });

  return { follow, isPending };
};

export default useFollow;
