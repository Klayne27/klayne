// hooks/mutations/useBlockUnblockUser.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { blockUnblockUserApi } from "../../api/usersApi"; // Corrected import path based on your API file

export const useBlockUnblockUser = () => {
  const queryClient = useQueryClient();

  const { mutate: blockUnblockUser, isLoading: isBlocking } = useMutation({
    mutationFn: blockUnblockUserApi,
    onSuccess: (data, userIdToBlock) => {
      toast.success(data.message || "User block status updated!");

      // --- CRITICAL: Invalidate relevant queries to refetch fresh data ---

      // 1. Invalidate the profile of the user who was blocked/unblocked
      queryClient.invalidateQueries({ queryKey: ["userProfile", userIdToBlock] });
      // You might also want to invalidate the *current* user's profile
      // if it contains a list of who they've blocked/who has blocked them.
      // queryClient.invalidateQueries({ queryKey: ["userProfile", "currentUserId"] }); // Assuming a key for current user

      // 2. Invalidate queries that display posts (e.g., main feed, specific user's posts)
      // This will remove/add posts by the blocked/unblocked user from feeds.
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      // If you have a specific hook for a user's posts with a key like ['userPosts', userId]:
      // queryClient.invalidateQueries({ queryKey: ["userPosts", userIdToBlock] });

      // 3. Invalidate queries that display comments/replies
      // This will remove/add comments/replies by the blocked/unblocked user.
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      // Removed: queryClient.invalidateQueries(["replies"]); - as it's covered by ["comments"] or not a standalone key

      // 4. Invalidate conversation/message lists
      // This will hide/show conversations with the blocked/unblocked user.
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      // Removed: queryClient.invalidateQueries(["messages", userIdToBlock]);
      // Invalidating ["conversations"] is usually enough to refresh the chat list,
      // and the backend should prevent fetching messages for blocked conversations.
      // If you need to invalidate specific conversation messages, you'd need the conversationId, not userId.

      // 5. Invalidate notifications
      // This will hide/show notifications from the blocked/unblocked user.
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      // 6. Invalidate suggested users, followers, following lists, and search results
      // Blocking/unblocking affects who is suggested, who appears in lists.
      queryClient.invalidateQueries({ queryKey: ["suggestedUsers"] });
      queryClient.invalidateQueries({ queryKey: ["followers"] }); // Assumes useFetchUsers uses ["followers"] prefix
      queryClient.invalidateQueries({ queryKey: ["following"] }); // Assumes useFetchUsers uses ["following"] prefix
      // If you have a useSearchUsers hook with ['searchUsers'] key:
      // queryClient.invalidateQueries({ queryKey: ["searchUsers"] });

      // Optional: If you display online users and fetch via API, invalidate:
      // queryClient.invalidateQueries({ queryKey: ["onlineUsers"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update user block status.");
      console.error("Block/Unblock mutation error:", error);
    },
  });

  return { blockUnblockUser, isBlocking };
};
