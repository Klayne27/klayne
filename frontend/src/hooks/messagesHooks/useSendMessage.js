import { useMutation, useQueryClient } from "@tanstack/react-query"
import { sendMessageApi } from "../../api/messagesApi"
import { useAuthUser } from "../authHooks/useAuthUser"
import { showAppToast } from "../../utils/showAppToast"
import { usePrivateChatStore } from "../../store/usePrivateChatStore"

export const useSendMessage = ({ onSenderMessageSent }) => {
  const replyingToMessage = usePrivateChatStore((state) => state.replyingToMessage)
  const { authUser: currentUser } = useAuthUser()
  const queryClient = useQueryClient()

  const { mutate: sendPrivateMessage, isPending: isSendingMessage } = useMutation({
    mutationFn: sendMessageApi,
    onMutate: async (newMessageData) => {
      const { conversationId } = newMessageData
      const messagesQueryKey = ["messages", conversationId]
      const conversationsQueryKey = ["conversations"]

      // 1. Cancel ongoing queries for both messages and conversations to prevent race conditions
      await queryClient.cancelQueries({ queryKey: messagesQueryKey })
      await queryClient.cancelQueries({ queryKey: conversationsQueryKey })

      const previousMessages = queryClient.getQueryData(messagesQueryKey)
      const previousConversations = queryClient.getQueryData(conversationsQueryKey)

      // 2. Create the optimistic message
      const optimisticMessage = {
        _id: `optimistic-${Date.now()}`,
        text: newMessageData.message,
        sender: currentUser,
        conversationId,
        createdAt: new Date().toISOString(),
        img: newMessageData.img || null,
        seen: false, // Optimistically set to false
        isOptimistic: true, // Add this flag to distinguish from server data
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
      }

      // 3. Optimistically update the messages query
      queryClient.setQueryData(messagesQueryKey, (oldData) => {
        if (!oldData?.pages) {
          return { pages: [[optimisticMessage]], pageParams: [1] }
        }
        const newData = { ...oldData, pages: [...oldData.pages] }
        newData.pages[0] = [...newData.pages[0], optimisticMessage]
        return newData
      })

      // 4. Optimistically update the conversations query
      // queryClient.setQueryData(conversationsQueryKey, (oldConversations) => {
      //   if (!oldConversations) return oldConversations

      //   const updatedConversations = oldConversations.map((conversation) => {
      //     if (conversation._id === conversationId) {
      //       return {
      //         ...conversation,
      //         lastMessage: {
      //           text: optimisticMessage.text,
      //           img: optimisticMessage.img,
      //           sender: currentUser,
      //           seen: false, // Set to false, as the recipient is assumed not to have the chat open
      //           messageId: optimisticMessage._id,
      //         },
      //       }
      //     }
      //     return conversation
      //   })

      //   // Optional: Move the updated conversation to the top of the list for better UX
      //   const updatedConversation = updatedConversations.find((c) => c._id === conversationId)
      //   if (updatedConversation) {
      //     const filteredConversations = updatedConversations.filter((c) => c._id !== conversationId)
      //     return [updatedConversation, ...filteredConversations]
      //   }

      //   return updatedConversations
      // })

      if (onSenderMessageSent) {
        onSenderMessageSent()
      }

      // Return context for onError to use
      return {
        previousMessages,
        previousConversations,
        messagesQueryKey,
        conversationsQueryKey,
        optimisticId: optimisticMessage._id,
      }
    },
    onSuccess: (newMessage, variables, context) => {
      // 5. On success, update the messages and conversations queries with the real data from the server
      queryClient.setQueryData(context.messagesQueryKey, (oldData) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          pages: oldData.pages.map((page) =>
            page.map((msg) =>
              msg._id === context.optimisticId ? { ...newMessage, isOptimistic: false } : msg,
            ),
          ),
        }
      })

      // We already updated the conversation list optimistically, so we just need to ensure it's still fresh
      // Invalidate the conversations query to re-fetch the accurate data from the server, including the real `seen` status
      queryClient.invalidateQueries({ queryKey: context.conversationsQueryKey })
    },
    onError: (err, variables, context) => {
      showAppToast(err.message, "error")
      // 6. On error, revert the optimistic updates
      queryClient.setQueryData(context.messagesQueryKey, context.previousMessages)
      queryClient.setQueryData(context.conversationsQueryKey, context.previousConversations)
    },
  })

  return { sendPrivateMessage, isSendingMessage }
}
