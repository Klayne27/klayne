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
      // ... (your existing onMutate logic - it looks fine for optimistic updates)
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

      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return { pages: [[tempMessage]], pageParams: [1] };
        }

        const newData = { ...oldData };
        newData.pages = [...oldData.pages];
        newData.pages[0] = [...newData.pages[0], tempMessage];

        return newData;
      });

      if (onMessageSentOptimistically) {
        onMessageSentOptimistically();
      }

      return { previousData, optimisticId: tempMessageId, queryKey };
    },

    onSuccess: (data, variables, context) => {
      // Assuming 'data' from sendMessageApi contains both 'newMessage' and 'conversation'
      const { newMessage, conversation: newRealConversation } = data; // <--- IMPORTANT: Destructure 'conversation'
      const newRealConversationId = newRealConversation?._id; // Get the ID from the new conversation object

      const finalQueryKeyConversationId =
        newRealConversationId || selectedConversation._id;
      const finalQueryKey = ["messages", finalQueryKeyConversationId];

      queryClient.setQueryData(finalQueryKey, (oldData) => {
        if (!oldData) return oldData;

        const newData = {
          ...oldData,
          pages: oldData.pages.map((page) =>
            page.map((msg) =>
              msg._id === context.optimisticId
                ? { ...newMessage, isOptimistic: undefined }
                : msg
            )
          ),
        };
        return newData;
      });

      queryClient.invalidateQueries({
        queryKey: finalQueryKey,
        exact: true,
        refetchType: "background",
      });

      if (
        isNewOrTemporaryChat &&
        newRealConversationId && // Check if ID exists
        selectedConversation._id !== newRealConversationId // Check if this is truly a new ID
      ) {
        // Remove the temporary query cache key for the old 'new chat' ID
        // This is important to ensure the new conversation uses the real ID for its cache.
        queryClient.removeQueries(["messages", context.queryKey[1]]);

        // THIS IS THE CRUCIAL CHANGE: Pass the full conversation object
        if (onNewConversationCreated) {
          onNewConversationCreated(newRealConversation); // <--- Pass the entire object
        }
      }
      queryClient.invalidateQueries({ queryKey: ["conversations"] }); // Refresh sidebar list

      currentOptimisticIdRef.current = null; // Clear optimistic ID after replacement
    },

    onError: (error, variables, context) => {
      console.error("Error sending message:", error);
      const { previousData, optimisticId, queryKey } = context;

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
  });

  return { sendMessage, isSendingMessage };
};
