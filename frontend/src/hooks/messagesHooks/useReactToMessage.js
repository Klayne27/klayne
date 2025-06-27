// src/hooks/messagesHooks/useReactToMessage.js
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
      await queryClient.cancelQueries({ queryKey: ["messages"] });

      const previousMessages = queryClient.getQueryData(["messages"]);

      queryClient.setQueryData(["messages"], (oldData) => {
        if (!oldData || !currentUser) return oldData;

        const userId = currentUser._id;
        const userUsername = currentUser.username; // For optimistic tooltip display

        const updatedPages = oldData.pages.map((page) =>
          page.map((message) => {
            if (message._id === messageId) {
              const newReactions = [...message.reactions];

              // Find if the user has already reacted with THIS SPECIFIC emoji
              const existingSpecificReactionIndex = newReactions.findIndex(
                (r) =>
                  (r.user?._id?.toString() || r.user?.toString()) === userId.toString() &&
                  r.emoji === emoji
              );

              if (existingSpecificReactionIndex !== -1) {
                // If user reacted with THIS emoji, remove it (toggle off)
                newReactions.splice(existingSpecificReactionIndex, 1);
              } else {
                // User has not reacted with this emoji, so add it
                // Make sure to mimic the populated user structure for the UI
                newReactions.push({
                  _id: `optimistic-${Date.now()}-${userId}-${emoji}`, // More unique optimistic ID
                  emoji: emoji,
                  user: {
                    _id: userId,
                    username: userUsername,
                    fullName: currentUser.fullName,
                    profileImg: currentUser.profileImg,
                  }, // Mimic populated user data for accurate display
                });
              }

              return { ...message, reactions: newReactions };
            }
            return message;
          })
        );
        return { ...oldData, pages: updatedPages };
      });

      return { previousMessages };
    },
    onSuccess: (updatedMessageFromServer) => {
      // Destructure directly
      // Server response is the fully updated message object
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
    },
    onError: (err, variables, context) => {
      toast.error(err.message || "Failed to react.");
      if (context?.previousMessages) {
        queryClient.setQueryData(["messages"], context.previousMessages);
      }
    },
    onSettled: () => {
      // No invalidateQueries here, rely on direct cache update and socket event
    },
  });
};
