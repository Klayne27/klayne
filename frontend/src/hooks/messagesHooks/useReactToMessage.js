// useReactToMessage.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { reactToMessageApi } from "../../api/messagesApi";

export const useReactToMessage = (selectedConversationId) => {
  const queryClient = useQueryClient();
  const { authUser: currentUser } = useAuthUser();

  return useMutation({
    mutationFn: ({ messageId, emoji }) => reactToMessageApi(messageId, emoji),
    onMutate: async ({ messageId, emoji }) => {
      // Cancel any ongoing fetches for this query to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ["messages", selectedConversationId] });

      // Snapshot the previous data before optimistic update
      const previousMessages = queryClient.getQueryData([
        "messages",
        selectedConversationId,
      ]);

      // Optimistically update the cache
      queryClient.setQueryData(["messages", selectedConversationId], (oldData) => {
        if (!oldData || !currentUser) return oldData;

        const userId = currentUser._id;
        const userUsername = currentUser.username; // Assuming these are always available

        const updatedPages = oldData.pages.map((page) =>
          page.map((message) => {
            if (message._id === messageId) {
              const newReactions = [...message.reactions]; // Create new array for reactions

              const existingSpecificReactionIndex = newReactions.findIndex(
                (r) =>
                  (r.user?._id?.toString() || r.user?.toString()) === userId.toString() &&
                  r.emoji === emoji
              );

              if (existingSpecificReactionIndex !== -1) {
                // If user already reacted with this emoji, remove it
                newReactions.splice(existingSpecificReactionIndex, 1);
              } else {
                // Otherwise, add the new optimistic reaction
                newReactions.push({
                  // Crucially, this _id should ideally be replaced by the server's actual ID
                  // but for optimistic display, a unique temporary ID is fine.
                  // The key is that onSuccess (or the refetch) will reconcile this.
                  _id: `optimistic-${Date.now()}-${userId}-${emoji}`, // Temporary optimistic ID
                  emoji: emoji,
                  user: {
                    _id: userId,
                    username: userUsername,
                    fullName: currentUser.fullName, // Include full user details for consistent display
                    profileImg: currentUser.profileImg,
                  },
                });
              }

              return { ...message, reactions: newReactions }; // Return new message object
            }
            return message; // Return unchanged message
          })
        );
        return { ...oldData, pages: updatedPages }; // Return new data structure
      });

      // Return context for onError
      return { previousMessages };
    },

    // --- CHANGE HERE ---
    onSuccess: () => {
      // Invalidate the query to trigger a background refetch
      // This will seamlessly replace the optimistic state with the server's true state
      queryClient.invalidateQueries({ queryKey: ["messages", selectedConversationId] });
      // You can add a toast here if you want a confirmation, but often not needed for reactions
      // toast.success("Reaction updated!"); // Optional
    },

    onError: (err, variables, context) => {
      toast.error(err.message || "Failed to react.");
      // Rollback to previous state on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["messages", selectedConversationId],
          context.previousMessages
        );
      }
    },
  });
};
