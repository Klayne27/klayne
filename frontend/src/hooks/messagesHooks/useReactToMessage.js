// src/hooks/messagesHooks/useReactToMessage.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser"; // Ensure this path is correct
import { reactToMessageApi } from "../../api/messagesApi"; // Ensure this path is correct

export const useReactToMessage = () => {
  const queryClient = useQueryClient();
  const { authUser: currentUser } = useAuthUser();

  return useMutation({
    mutationFn: ({ messageId, emoji }) => reactToMessageApi(messageId, emoji),
    onMutate: async ({ messageId, emoji }) => {
      // 1. Cancel any outgoing refetches to prevent them from overwriting our optimistic update
      //    This is crucial. Ensure no other queries are currently fetching 'messages'.
      await queryClient.cancelQueries({ queryKey: ["messages"] });

      // 2. Snapshot the current data before modifying it
      const previousMessages = queryClient.getQueryData(["messages"]);

      // 3. Optimistically update the cache for the 'messages' query
      queryClient.setQueryData(["messages"], (oldData) => {
        if (!oldData || !currentUser) return oldData;

        const userId = currentUser._id;
        const userUsername = currentUser.username; // For optimistic tooltip display

        const updatedPages = oldData.pages.map((page) =>
          page.map((message) => {
            if (message._id === messageId) {
              const newReactions = [...message.reactions];

              const existingUserReactionIndex = newReactions.findIndex(
                (r) =>
                  (r.user?._id?.toString() || r.user?.toString()) === userId.toString()
              );

              const existingSpecificReactionIndex = newReactions.findIndex(
                (r) =>
                  (r.user?._id?.toString() || r.user?.toString()) === userId.toString() &&
                  r.emoji === emoji
              );

              if (existingSpecificReactionIndex !== -1) {
                // If user reacted with THIS emoji, remove it (toggle off)
                newReactions.splice(existingSpecificReactionIndex, 1);
              } else if (existingUserReactionIndex !== -1) {
                // If user reacted with a DIFFERENT emoji, replace it
                newReactions[existingUserReactionIndex] = {
                  _id: `optimistic-${Date.now()}-${userId}`, // Temp ID for optimistic state
                  emoji: emoji,
                  user: { _id: userId, username: userUsername }, // Mimic populated user for UI
                };
              } else {
                // No existing reaction from this user, add the new one
                newReactions.push({
                  _id: `optimistic-${Date.now()}-${userId}`,
                  emoji: emoji,
                  user: { _id: userId, username: userUsername },
                });
              }

              return { ...message, reactions: newReactions };
            }
            return message;
          })
        );
        return { ...oldData, pages: updatedPages };
      });

      // 4. Return context for potential rollback
      return { previousMessages };
    },
    onSuccess: (updatedMessageFromServer, variables) => {
      // The server successfully reacted. Now, CONFIRM/RECONCILE the cache.
      // This is crucial: the server's response (updatedMessageFromServer)
      // should contain the *final, correct* state of the message.
      queryClient.setQueryData(["messages"], (oldData) => {
        if (!oldData) return oldData;

        const updatedPages = oldData.pages.map((page) =>
          page.map((message) =>
            // Replace the optimistically updated message with the server's definitive version
            message._id === updatedMessageFromServer._id
              ? updatedMessageFromServer
              : message
          )
        );
        return { ...oldData, pages: updatedPages };
      });
      // No toast.success here, as it might feel redundant with instant UI update.
    },
    onError: (err, variables, context) => {
      toast.error(err.message || "Failed to react.");
      // Rollback the cache if the mutation failed
      if (context?.previousMessages) {
        queryClient.setQueryData(["messages"], context.previousMessages);
      }
    },
    // IMPORTANT: Keep onSettled empty or remove the invalidateQueries from here.
    // We want onSuccess to handle the precise cache update.
    onSettled: () => {
      // If you absolutely need a refetch after every reaction (e.g., if there are
      // other complex side effects), make sure it doesn't cause a flicker.
      // For a simple reaction toggle, direct cache update in onSuccess is best.
      // queryClient.invalidateQueries(["messages"]); // Avoid this here!
    },
  });
};
