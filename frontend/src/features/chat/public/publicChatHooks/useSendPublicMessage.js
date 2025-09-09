import { useMutation, useQueryClient } from "@tanstack/react-query"
import { sendPublicMessageApi } from "../../../../api/publicChatApi"
import { useAuthUser } from "../../../auth/authHooks/useAuthUser"
import { showAppToast } from "../../../../utils/showAppToast"
import { messageKeys } from "../../private/privateChatHooks/messageKeys"

export const useSendPublicMessage = ({ onSenderMessageSent }) => {
  const queryClient = useQueryClient()
  const queryKey = messageKeys.publicMessages()
  const { authUser } = useAuthUser()

  const {
    mutate: sendPublicMessage,
    isPending: isSendingPublicMessage,
    isError,
    error,
    reset,
  } = useMutation({
    mutationFn: async (messageData) => sendPublicMessageApi(messageData),

    onMutate: async (messageData) => {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      await queryClient.cancelQueries({ queryKey: queryKey })

      const previousMessages = queryClient.getQueryData(queryKey)

      let populatedRepliedTo = null
      if (messageData.repliedTo) {
        const allMessages = previousMessages?.pages.flat() || []
        const repliedMessageInCache = allMessages.find((msg) => msg._id === messageData.repliedTo)

        if (repliedMessageInCache) {
          populatedRepliedTo = {
            _id: repliedMessageInCache._id,
            text: repliedMessageInCache.text,
            img: repliedMessageInCache.img,
            voiceMessageId: repliedMessageInCache.voiceMessageId.imageUrl,
            isDeletedByAdmin: repliedMessageInCache.isDeletedByAdmin,
            isDeletedByUser: repliedMessageInCache.isDeletedByUser,
            sender: {
              _id: repliedMessageInCache.sender?._id,
              username: repliedMessageInCache.sender?.username || "Unknown User",
            },
          }
        }
      }

      const optimisticMessage = {
        _id: tempId,
        text: messageData.text,
        img: messageData.imgBase64,
        sender: {
          _id: authUser._id,
          username: authUser.username,
          fullName: authUser.fullName,
          profileImg: authUser.profileImg,
          isAdmin: authUser.isAdmin,
          isVerified: authUser.isVerified,
          isGoldVerified: authUser.isGoldVerified,
          isBannedInPublicChat: authUser.isBannedInPublicChat,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOptimistic: true,
        repliedTo: populatedRepliedTo,
        isDeletedByAdmin: false,
        isDeletedByUser: false,
        reactions: [],
      }

      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return { pages: [[optimisticMessage]], pageParams: [undefined] }
        }
        const newPages = oldData.pages.map((page) => [...page])

        newPages[0].push(optimisticMessage)

        return {
          ...oldData,
          pages: newPages,
        }
      })

      if (onSenderMessageSent) {
        onSenderMessageSent()
      }
      return { previousMessages, tempId }
    },

    onSuccess: (serverMessage, variables, context) => {
      const { tempId } = context

      // queryClient.setQueryData(queryKey, (oldData) => {
      //   if (!oldData) return oldData
      //   const updatedPages = oldData.pages.map((page) =>
      //     page.map((msg) => (msg._id === tempId ? serverMessage : msg)),
      //   )
      //   return { ...oldData, pages: updatedPages }
      // })
      queryClient.invalidateQueries(messageKeys.publicMessages())
    },

    onError: (error, variables, context) => {
      showAppToast(error.message || "Failed to send message", "error")
      if (context?.previousMessages) {
        queryClient.setQueryData(queryKey, context.previousMessages)
      } else {
        queryClient.setQueryData(queryKey, (oldData) => {
          if (!oldData) return oldData
          const updatedPages = oldData.pages.map((page) =>
            page.filter((msg) => msg._id !== context.tempId),
          )
          return { ...oldData, pages: updatedPages }
        })
      }
    },

  })

  return { sendPublicMessage, isSendingPublicMessage, isError, error, reset }
}
