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

    // Your onMutate is perfect. The temporary optimistic ID is crucial.
    onMutate: async ({ messageId, emoji }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", selectedConversationId] });
      const previousMessages = queryClient.getQueryData([
        "messages",
        selectedConversationId,
      ]);

      queryClient.setQueryData(["messages", selectedConversationId], (oldData) => {
        if (!oldData || !currentUser) return oldData;
        const userId = currentUser._id;
        const updatedPages = oldData.pages.map((page) =>
          page.map((message) => {
            if (message._id === messageId) {
              const newReactions = [...message.reactions];
              const existingReactionIndex = newReactions.findIndex(
                (r) =>
                  (r.user?._id || r.user)?.toString() === userId.toString() &&
                  r.emoji === emoji
              );

              if (existingReactionIndex !== -1) {
                newReactions.splice(existingReactionIndex, 1);
              } else {
                newReactions.push({
                  _id: `optimistic-${Date.now()}-${userId}-${emoji}`, // This ID is key
                  emoji: emoji,
                  user: {
                    _id: userId,
                    username: currentUser.username,
                    fullName: currentUser.fullName,
                    profileImg: currentUser.profileImg,
                  },
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

    // --- ✅ NEW, SMARTER onSuccess LOGIC ---
    onSuccess: (updatedMessageFromApi) => {
      queryClient.setQueryData(["messages", selectedConversationId], (oldData) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page) =>
            page.map((message) => {
              if (message._id === updatedMessageFromApi._id) {
                // The reactions confirmed by the server for THIS mutation
                const serverReactions = updatedMessageFromApi.reactions;

                // Find any other optimistic reactions from other IN-FLIGHT mutations
                // that exist in our current cache but are not yet in the server's response.
                const otherOptimisticReactions = message.reactions.filter(
                  (cachedReaction) =>
                    // It must be an optimistic reaction
                    cachedReaction._id.toString().startsWith("optimistic-") &&
                    // And it must NOT be in the list of reactions just confirmed by the server
                    !serverReactions.some(
                      (serverReaction) =>
                        serverReaction.emoji === cachedReaction.emoji &&
                        (serverReaction.user._id || serverReaction.user).toString() ===
                          (cachedReaction.user._id || cachedReaction.user).toString()
                    )
                );

                // The new state is the confirmed server reactions PLUS the other pending optimistic ones.
                return {
                  ...updatedMessageFromApi,
                  reactions: [...serverReactions, ...otherOptimisticReactions],
                };
              }
              return message;
            })
          ),
        };
      });
    },

    // Your onError rollback is correct
    onError: (err, variables, context) => {
      toast.error(err.message || "Failed to react.");
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["messages", selectedConversationId],
          context.previousMessages
        );
      }
    },
  });
};
