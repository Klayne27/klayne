import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendMessageApi } from "../../api/messagesApi";
import { useAuthUser } from "../authHooks/useAuthUser";

export const useSendMessage = ({
  selectedConversation,
  isNewOrTemporaryChat,
  onNewConversationCreated,
  replyingToMessage,
  currentOptimisticIdRef,
  onMessageSentOptimistically,
}) => {
  const { authUser: currentUser } = useAuthUser();
  const queryClient = useQueryClient();

  const { mutate: sendMessage, isPending: isSendingMessage } = useMutation({
    mutationFn: sendMessageApi,

    onMutate: async (newMessageData) => {
      const queryKeyConversationId = isNewOrTemporaryChat
        ? `temp-${selectedConversation.participants[0]._id}`
        : selectedConversation?._id;

      const queryKey = ["messages", queryKeyConversationId];

      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData(queryKey);

      const tempMessageId = `optimistic-${Date.now()}-${Math.random()}`;
      currentOptimisticIdRef.current = tempMessageId;

      const tempMessage = {
        _id: tempMessageId,
        text: newMessageData.message,
        sender: {
          _id: currentUser._id,
          username: currentUser.username,
          fullName: currentUser.fullName,
          profileImg: currentUser.profileImg,
          isVerified: currentUser.isVerified,
        },
        conversationId: selectedConversation?._id || queryKeyConversationId,
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

      // Still add optimistic message to cache immediately
      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return { pages: [[tempMessage]], pageParams: [1] };
        }

        const newData = { ...oldData };
        newData.pages = [...oldData.pages];
        newData.pages[0] = [...newData.pages[0], tempMessage]; // Add to the most recent page

        return newData;
      });

      if (onMessageSentOptimistically) {
        onMessageSentOptimistically();
      }

      return { previousData, optimisticId: tempMessageId, queryKey };
    },

    onSuccess: (data, variables, context) => {
      const { newMessage, conversationId: newRealConversationId } = data;

      const finalQueryKeyConversationId =
        newRealConversationId || selectedConversation._id;
      const finalQueryKey = ["messages", finalQueryKeyConversationId];

      // *** REVERT TO setQueryData here to immediately replace optimistic with real message ***
      // This is crucial for instant display of your own sent messages.
      queryClient.setQueryData(finalQueryKey, (oldData) => {
        if (!oldData) return oldData;

        const newData = {
          ...oldData,
          pages: oldData.pages.map((page) =>
            page.map((msg) =>
              msg._id === context.optimisticId // Find the optimistic message by its temp ID
                ? { ...newMessage, isOptimistic: undefined } // Replace with real message, clear optimistic flag
                : msg
            )
          ),
        };
        return newData;
      });

      // After updating the UI, you can still invalidate for a background refetch
      // to ensure consistency, but the UI is already updated.
      queryClient.invalidateQueries({
        queryKey: finalQueryKey,
        exact: true,
        refetchType: "background", // Suggests a background refetch, doesn't block
      });

      if (
        isNewOrTemporaryChat &&
        newRealConversationId &&
        selectedConversation._id !== newRealConversationId
      ) {
        queryClient.removeQueries(["messages", context.queryKey[1]]);
        if (onNewConversationCreated) {
          onNewConversationCreated(newRealConversationId);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      currentOptimisticIdRef.current = null;
    },

    onError: (error, variables, context) => {
      console.error("Error sending message:", error);
      const { previousData, optimisticId, queryKey } = context;

      // On error, revert optimistic message manually
      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData) return oldData;
        const newData = { ...oldData };
        newData.pages = oldData.pages.map((page) =>
          page.filter((msg) => msg._id !== optimisticId)
        );
        return newData;
      });

      currentOptimisticIdRef.current = null;
    },

    onSettled: (data, error, variables, context) => {
      // This onSettled is typically redundant if onSuccess already invalidates.
      // If you need it, ensure it's not causing issues.
      // const settledQueryKey = ["messages", data?.conversationId || context.queryKey[1]];
      // queryClient.invalidateQueries({ queryKey: settledQueryKey, exact: true });
    },
  });

  return { sendMessage, isSendingMessage };
};
