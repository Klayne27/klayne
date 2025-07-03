import toast from "react-hot-toast";
import { blockUnblockUserApi } from "../../api/usersApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useBlockUnblockUser = () => {
  const queryClient = useQueryClient();

  const { mutate: blockUnblockUser, isLoading: isBlocking } = useMutation({
    mutationFn: blockUnblockUserApi,
    onSuccess: (data, variables) => {
      toast.success(data.message || "User block status updated!");

      const targetUserId = variables;

      queryClient.setQueryData(["authUser"], (oldAuthUser) => {
        if (!oldAuthUser) return oldAuthUser;

        const isCurrentlyBlockedByAuthUser =
          oldAuthUser.blockedUsers?.includes(targetUserId);

        let newBlockedUsers;
        if (isCurrentlyBlockedByAuthUser) {
          newBlockedUsers = oldAuthUser.blockedUsers.filter((id) => id !== targetUserId);
        } else {
          newBlockedUsers = [...(oldAuthUser.blockedUsers || []), targetUserId];
        }

        return {
          ...oldAuthUser,
          blockedUsers: newBlockedUsers,
        };
      });

      if (data.username) {
        queryClient.setQueryData(["userProfile", data.username], (oldData) => {
          return {
            ...oldData,
            user: oldData?.user,
            isBlockedByYou: data.isBlockedByYou,
            hasBlockedYou: data.hasBlockedYou,
            message: data.message,
            status: 200,
          };
        });
      }

      if (data.username) {
        queryClient.invalidateQueries({ queryKey: ["userProfile", data.username] });
      } else {
        console.warn(
          "API response for block/unblock did not contain the affected username for userProfile invalidation."
        );
      }

      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["suggestedUsers"] });
      queryClient.invalidateQueries({ queryKey: ["followers"] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update user block status.");
      console.error("Block/Unblock mutation error:", error);
    },
  });

  return { blockUnblockUser, isBlocking };
};
