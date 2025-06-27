import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { reactToMessageApi } from "../../api/messagesApi";

export const useReactToMessage = () => {
  const queryClient = useQueryClient();
  const { authUser: currentUser } = useAuthUser();

  return useMutation({
    mutationFn: ({ messageId, emoji }) => reactToMessageApi(messageId, emoji),
    onMutate: async ({ messageId, emoji }) => {
      // 1. Cancel any outgoing refetches to prevent them from overwriting our optimistic update
      await queryClient.cancelQueries(["messages"]);

      // 2. Snapshot the current data
      const previousMessages = queryClient.getQueryData(["messages"]);

      // 3. Optimistically update the cache
      queryClient.setQueryData(["messages"], (oldData) => {
        if (!oldData || !currentUser) return oldData;

        const userId = currentUser._id;
        const userUsername = currentUser.username; // Get username for tooltip

        const updatedPages = oldData.pages.map((page) =>
          page.map((message) => {
            if (message._id === messageId) {
              const newReactions = [...message.reactions]; // Create a mutable copy

              // Check if the user already reacted with ANY emoji
              const existingUserReactionIndex = newReactions.findIndex(
                (r) => (r.user._id?.toString() || r.user.toString()) === userId.toString()
              );

              // Check if the user reacted with THIS specific emoji
              const existingSpecificReactionIndex = newReactions.findIndex(
                (r) =>
                  (r.user._id?.toString() || r.user.toString()) === userId.toString() &&
                  r.emoji === emoji
              );

              if (existingSpecificReactionIndex !== -1) {
                // If the user already reacted with THIS emoji, remove it (toggling off)
                newReactions.splice(existingSpecificReactionIndex, 1);
              } else if (existingUserReactionIndex !== -1) {
                // If the user reacted with a DIFFERENT emoji, replace it
                newReactions[existingUserReactionIndex] = {
                  _id: `optimistic-${Date.now()}-${userId}`, // Unique temp ID
                  emoji: emoji,
                  user: { _id: userId, username: userUsername }, // Mimic populated user
                };
              } else {
                // If the user has no reactions on this message, add the new one
                newReactions.push({
                  _id: `optimistic-${Date.now()}-${userId}`, // Unique temp ID
                  emoji: emoji,
                  user: { _id: userId, username: userUsername }, // Mimic populated user
                });
              }

              return { ...message, reactions: newReactions };
            }
            return message;
          })
        );
        return { ...oldData, pages: updatedPages };
      });

      // 4. Return a context object with the snapshot value
      return { previousMessages };
    },
    onError: (err, variables, context) => {
      toast.error(err.message || "Failed to react.");
      // If the mutation fails, use the context for a rollback
      if (context?.previousMessages) {
        queryClient.setQueryData(["messages"], context.previousMessages);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state is reflected
      queryClient.invalidateQueries(["messages"]);
    },
  });
};
