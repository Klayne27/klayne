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
      const queryKey = ["messages", conversationId]

      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData(queryKey)

      const optimisticMessage = {
        _id: `optimistic-${Date.now()}`,
        text: newMessageData.message,
        sender: currentUser,
        conversationId,
        createdAt: new Date().toISOString(),
        img: newMessageData.img || null,
        seen: false,
        isOptimistic: false,
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

      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData?.pages) {
          return { pages: [[optimisticMessage]], pageParams: [1] }
        }
        const newData = { ...oldData, pages: [...oldData.pages] }
        newData.pages[0] = [...newData.pages[0], optimisticMessage]
        return newData
      })

      if (onSenderMessageSent) {
        onSenderMessageSent()
      }

      return { previousData, queryKey, optimisticId: optimisticMessage._id }
    },
    onSuccess: (newMessage, variables, context) => {
      queryClient.setQueryData(context.queryKey, (oldData) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          pages: oldData.pages.map((page) =>
            page.map((msg) => (msg._id === context.optimisticId ? newMessage : msg)),
          ),
        }
      })
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
    },
    onError: (err, variables, context) => {
      showAppToast(err.message, "error")
      queryClient.setQueryData(context.queryKey, context.previousData)
    },
  })

  return { sendPrivateMessage, isSendingMessage }
}
