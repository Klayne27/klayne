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
        const userUsername = currentUser.username;

        const updatedPages = oldData.pages.map((page) =>
          page.map((message) => {
            if (message._id === messageId) {
              const newReactions = [...message.reactions];

              const existingSpecificReactionIndex = newReactions.findIndex(
                (r) =>
                  (r.user?._id?.toString() || r.user?.toString()) === userId.toString() &&
                  r.emoji === emoji
              );

              if (existingSpecificReactionIndex !== -1) {
                newReactions.splice(existingSpecificReactionIndex, 1);
              } else {
                newReactions.push({
                  _id: `optimistic-${Date.now()}-${userId}-${emoji}`,
                  emoji: emoji,
                  user: {
                    _id: userId,
                    username: userUsername,
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
    onSuccess: (updatedMessageFromServer) => {
      queryClient.setQueryData(["messages"], (oldData) => {
        if (!oldData) return oldData;

        const updatedPages = oldData.pages.map((page) =>
          page.map((message) =>
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
  });
};
