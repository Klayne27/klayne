import { useMutation, useQueryClient } from "@tanstack/react-query"
import { messageKeys } from "./messageKeys"
import { conversationKeys } from "./conversationKeys"
import { usePrivateChatStore } from "../../../../store/usePrivateChatStore"
import { useAuthUser } from "../../../auth/authHooks/useAuthUser"
import { sendMessageApi } from "../../../../api/privateChatApi"
import { showAppToast } from "../../../../utils/showAppToast"

export const useSendMessage = (onSenderMessageSent) => {
  const replyingToMessage = usePrivateChatStore((state) => state.replyingToMessage)
  const { authUser: currentUser } = useAuthUser()
  const queryClient = useQueryClient()

  const { mutate: sendPrivateMessage, isPending: isSendingMessage } = useMutation({
    mutationFn: sendMessageApi,
    onMutate: async (newMessageData) => {
      const { conversationId } = newMessageData
      const messagesQueryKey = messageKeys.privateMessages(conversationId)
      const conversationQueryKey = conversationKeys.list()

      await queryClient.cancelQueries({ queryKey: messagesQueryKey })
      await queryClient.cancelQueries({ queryKey: conversationQueryKey })

      const previousMessages = queryClient.getQueryData(messagesQueryKey)
      const previousConversations = queryClient.getQueryData(conversationQueryKey)

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
              voiceMessageId: replyingToMessage.voiceMessageId?.imageUrl,
              img: replyingToMessage.img,
            }
          : null,
        audio: newMessageData.voiceMessage || null, // Add the audio property
      }

      queryClient.setQueryData(messagesQueryKey, (oldData) => {
        if (!oldData?.pages) {
          return { pages: [[optimisticMessage]], pageParams: [1] }
        }
        const newData = { ...oldData, pages: [...oldData.pages] }
        newData.pages[0] = [...newData.pages[0], optimisticMessage]
        return newData
      })

      queryClient.setQueryData(conversationQueryKey, (oldData) => {
        if (!oldData) return oldData

        const newConversations = oldData.map((conversation) => {
          if (conversation._id === conversationId) {
            return {
              ...conversation,
              lastMessage: {
                text: optimisticMessage.text,
                sender: optimisticMessage.sender,
                img: optimisticMessage.img,
                seen: optimisticMessage.seen,
                messageId: optimisticMessage._id,
                audio: optimisticMessage.audio, // Add the audio property here
              },
              updatedAt: optimisticMessage.createdAt,
            }
          }
          return conversation
        })
        return newConversations
      })

      if (onSenderMessageSent) {
        onSenderMessageSent()
      }

      return {
        previousMessages,
        previousConversations,
        messagesQueryKey,
        conversationQueryKey,
        conversationId,
        optimisticId: optimisticMessage._id,
      }
    },
    onSuccess: (newMessage, variables, context) => {
      // queryClient.setQueryData(context.messagesQueryKey, (oldData) => {
      //   console.log('newmessage',newMessage);
      //   if (!oldData) return oldData
      //   return {
      //     ...oldData,
      //     pages: oldData.pages.map((page) =>
      //       page.map((msg) =>
      //         msg._id === context.optimisticId ? { ...newMessage, isOptimistic: false } : msg,
      //       ),
      //     ),
      //   }
      // })
      queryClient.invalidateQueries(messageKeys.privateMessages(context.conversationId))
      queryClient.setQueryData(conversationKeys.list(), (oldData) => {
        if (!oldData) return oldData
        return oldData.map((conversation) => {
          if (conversation._id === newMessage.conversationId) {
            return {
              ...conversation,
              lastMessage: {
                text: newMessage.text,
                sender: newMessage.sender,
                img: newMessage.img,
                seen: newMessage.seen,
                messageId: newMessage._id,
                audio: newMessage.voiceMessageId?.imageUrl,
              },
              updatedAt: newMessage.createdAt,
            }
          }
          return conversation
        })
      })
    },

    onError: (err, variables, context) => {
      showAppToast(err.message, "error")
      // 6. On error, revert the optimistic updates
      queryClient.setQueryData(context.messagesQueryKey, context.previousMessages)
      queryClient.setQueryData(context.conversationQueryKey, context.previousConversations)
    },
  })

  return { sendPrivateMessage, isSendingMessage }
}
