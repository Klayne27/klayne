import toast from "react-hot-toast";
import { blockUnblockUserApi } from "../../api/usersApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useBlockUnblockUser = () => {
  const queryClient = useQueryClient();

  const { mutate: blockUnblockUser, isLoading: isBlocking } = useMutation({
    mutationFn: blockUnblockUserApi,
    onSuccess: (data, variables) => {
      // 'data' now contains {message, username, isBlockedByYou, hasBlockedYou}
      toast.success(data.message || "User block status updated!");

      const targetUserId = variables; // The ID passed to mutate, which is user._id from ProfilePage

      // 1. Optimistically update the authUser cache for immediate UI feedback on 'blockedUsers'
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

        // Return a new object with updated blockedUsers
        return {
          ...oldAuthUser,
          blockedUsers: newBlockedUsers,
        };
      });

      // 2. Optimistically update the target user's profile cache to reflect the change
      // Use the username from the API response for the query key
      if (data.username) {
        queryClient.setQueryData(["userProfile", data.username], (oldData) => {
          // If oldData is null or undefined (e.g., first fetch was 403), create a new structure
          return {
            ...oldData, // Keep existing properties if any
            user: oldData?.user, // Keep the user object if it existed
            isBlockedByYou: data.isBlockedByYou, // Update with the new status from server
            hasBlockedYou: data.hasBlockedYou, // Update with the new status from server
            message: data.message, // Update message if applicable
            status: 200, // Assuming a successful block/unblock
          };
        });
      }

      // 3. Invalidate relevant queries to ensure eventual consistency from the server
      // Invalidate the specific userProfile query for the blocked/unblocked user, using username
      if (data.username) {
        queryClient.invalidateQueries({ queryKey: ["userProfile", data.username] });
      } else {
        // Fallback if username is not returned (less ideal)
        console.warn(
          "API response for block/unblock did not contain the affected username for userProfile invalidation."
        );
      }

      queryClient.invalidateQueries({ queryKey: ["authUser"] }); // Invalidate authUser to get server's truth
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
