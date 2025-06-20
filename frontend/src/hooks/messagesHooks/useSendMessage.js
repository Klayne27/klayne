import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendMessageApi } from "../../api/messagesApi";
import { useAuthUser } from "../authHooks/useAuthUser";

export const useSendMessage = ({
  selectedConversation,
  isNewOrTemporaryChat,
  onNewConversationCreated,
  replyingToMessage,
  currentOptimisticIdRef,
}) => {
  const { authUser: currentUser } = useAuthUser();

  const queryClient = useQueryClient();
  const { mutate: sendMessage, isPending: isSendingMessage } = useMutation({
    mutationFn: sendMessageApi,
    onMutate: async (newMessageData) => {
      await queryClient.cancelQueries(["messages", selectedConversation?._id]);
      const previousMessages = queryClient.getQueryData([
        "messages",
        selectedConversation?._id,
      ]);

      const tempMessageId = `temp-${Date.now()}-${Math.random()}`;
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
        conversationId: selectedConversation._id,
        createdAt: new Date().toISOString(),
        img: newMessageData.img || null,
        seen: false,
        isOptimistic: true,
        repliedTo: replyingToMessage
          ? {
              _id: replyingToMessage._id,
              text: replyingToMessage.text,
              img: replyingToMessage.img,
              sender: {
                _id: replyingToMessage.sender._id,
                username: replyingToMessage.sender.username,
                fullName: replyingToMessage.sender.fullName,
                profileImg: replyingToMessage.sender.profileImg,
                isVerified: replyingToMessage.sender.isVerified,
              },
            }
          : null,
      };

      queryClient.setQueryData(["messages", selectedConversation?._id], (oldMessages) => {
        return [...(oldMessages || []), tempMessage];
      });

      return { previousMessages, optimisticId: tempMessageId };
    },
    onSuccess: (data, variables, context) => {
      const { newMessage, conversationId: newRealConversationId } = data;
      queryClient.setQueryData(["messages", newRealConversationId], (oldMessages) => {
        const messagesArray = oldMessages || [];

        const updatedMessages = messagesArray.map((msg) =>
          msg._id === context.optimisticId ? newMessage : msg
        );

        if (!updatedMessages.some((msg) => msg._id === newMessage._id)) {
          return [...updatedMessages, newMessage];
        }

        return updatedMessages;
      });

      if (isNewOrTemporaryChat && selectedConversation._id !== newRealConversationId) {
        queryClient.removeQueries(["messages", selectedConversation._id]);

        if (onNewConversationCreated) {
          onNewConversationCreated(newRealConversationId);
        }
      } else {
        queryClient.invalidateQueries(["conversations"]);
      }
    },
    onError: (error, variables, context) => {
      console.error("Error sending message:", error);
      queryClient.setQueryData(["messages", selectedConversation._id], (oldMessages) => {
        return (oldMessages || []).filter((msg) => msg._id !== context.optimisticId);
      });
      currentOptimisticIdRef.current = null;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
  return { sendMessage, isSendingMessage };
};
