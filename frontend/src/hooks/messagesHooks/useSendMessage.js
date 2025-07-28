import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendMessageApi } from "../../api/messagesApi";
import { useAuthUser } from "../authHooks/useAuthUser";
import toast from "react-hot-toast";
import { showAppToast } from "../../utils/showAppToast";

export const useSendMessage = ({ replyingToMessage, onOptimisticSend }) => {
  const { authUser: currentUser } = useAuthUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendMessageApi,
    onMutate: async (newMessageData) => {
      const { conversationId } = newMessageData;
      const queryKey = ["messages", conversationId];

      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      const optimisticMessage = {
        _id: `optimistic-${Date.now()}`,
        text: newMessageData.message,
        sender: currentUser,
        conversationId,
        createdAt: new Date().toISOString(),
        img: newMessageData.img || null,
        seen: false,
        isOptimistic: true,
        repliedTo: replyingToMessage
          ? {
              _id: replyingToMessage._id,
              text: replyingToMessage.text,
              sender: {
                _id: replyingToMessage.sender._id,
                username: replyingToMessage.sender.username,
              },
              img: replyingToMessage.img,
            }
          : null,
      };

      // Update the cache optimistically
      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData?.pages) {
          return { pages: [[optimisticMessage]], pageParams: [1] };
        }
        const newData = { ...oldData, pages: [...oldData.pages] };
        newData.pages[0] = [...newData.pages[0], optimisticMessage];
        return newData;
      });

      if (onOptimisticSend) {
        onOptimisticSend(); // Signal that an optimistic message was added
      }

      return { previousData, queryKey, optimisticId: optimisticMessage._id };
    },
    onSuccess: (newMessage, variables, context) => {
      // Replace the optimistic message with the real one from the server
      queryClient.setQueryData(context.queryKey, (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) =>
            page.map((msg) => (msg._id === context.optimisticId ? newMessage : msg))
          ),
        };
      });
      // Invalidate the main conversations list to update the `lastMessage` in the sidebar.
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (err, variables, context) => {
      // Roll back the optimistic update on error
      showAppToast(err.message, "error");
      queryClient.setQueryData(context.queryKey, context.previousData);
    },
  });
};
