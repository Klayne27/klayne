import { useMutation, useQueryClient } from "@tanstack/react-query"
import { addPublicMessageReactionApi, adminDeletePublicMessageApi, banUserFromPublicChatApi, deleteOwnPublicMessageApi, editPublicMessageApi, sendPublicMessageApi, unbanUserFromPublicChatApi } from "../../../../api/publicChatApi"
import { useAuthUser } from "../../../auth/authHooks/useAuthUser"
import { showAppToast } from "../../../../utils/showAppToast"
import { messageKeys } from "../../common/hooks/messageKeys"

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
            voiceMessageId: repliedMessageInCache.voiceMessageId?.imageUrl,
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
          isCha: authUser.isCha,
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

export const useDeleteOwnPublicMessage = () => {
  const queryClient = useQueryClient()
  const queryKey = messageKeys.publicMessages()

  const { mutate: deleteOwnMessage, isPending: isDeletingOwnMessage } = useMutation({
    mutationFn: (messageId) => deleteOwnPublicMessageApi(messageId),
    onMutate: async (messageIdToDelete) => {
      await queryClient.cancelQueries(queryKey)
      const previousMessages = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData) return oldData
        const newPages = oldData.pages.map((page) =>
          page.map((message) => {
            if (message._id === messageIdToDelete) {
              return {
                ...message,
                isDeletedByUser: true,
                text: "[Message Deleted]",
                img: null,
                repliedTo: message.repliedTo
                  ? {
                      ...message.repliedTo,
                      text: "",
                      img: null,
                      isOriginalMessageDeleted: true,
                    }
                  : null,
              }
            }
            if (message.repliedTo && message.repliedTo._id === messageIdToDelete) {
              return {
                ...message,
                repliedTo: {
                  ...message.repliedTo,
                  text: "[Message Deleted]",
                  img: null,
                  isDeletedByUser: true,
                  isOriginalMessageDeleted: true,
                },
              }
            }
            return message
          }),
        )
        return { ...oldData, pages: newPages }
      })

      return { previousMessages }
    },
    onError: (err, messageIdToDelete, context) => {
      showAppToast(err.message || "Failed to delete message.", "error")
      if (context?.previousMessages) {
        queryClient.setQueryData(queryKey, context.previousMessages)
      }
    },
  })

  return { deleteOwnMessage, isDeletingOwnMessage }
}

export const useDeletePublicMessage = () => {
  const {
    mutate: adminDeletePublicMessage,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: adminDeletePublicMessageApi,
    onError: (error) => {
      showAppToast(error.message || "Failed to delete message", "error")
    },
  })

  return { adminDeletePublicMessage, isPending, isError, error }
}

export const useEditPublicMessage = () => {
  const queryClient = useQueryClient()
  const queryKey = messageKeys.publicMessages()

  const { mutate: editPublicMessage, isPending: isEditing } = useMutation({
    mutationFn: ({ messageId, newText }) => editPublicMessageApi(messageId, newText),

    onMutate: async ({ messageId, newText }) => {
      await queryClient.cancelQueries({ queryKey: queryKey })
      const previousMessages = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData || !oldData.pages) return oldData

        const updatedPages = oldData.pages.map((page) =>
          page.map((message) => {
            if (message._id === messageId) {
              return {
                ...message,
                text: newText,
                isEdited: true,
              }
            }
            return message
          }),
        )
        return { ...oldData, pages: updatedPages }
      })

      return { previousMessages, messageId }
    },

    onSuccess: (serverMessage, variables, context) => {
      const { messageId } = context

      // queryClient.setQueryData(queryKey, (oldData) => {
      //   if (!oldData || !oldData.pages) return oldData
      //   const updatedPages = oldData.pages.map((page) =>
      //     page.map((message) =>
      //       // The messageId in this comparison is the correct, permanent ID.
      //       message._id === messageId ? serverMessage : message,
      //     ),
      //   )
      //   return { ...oldData, pages: updatedPages }
      // })
      queryClient.invalidateQueries({})
    },

    onError: (error, variables, context) => {
      showAppToast(error.message || "Failed to edit message.", "error")
      queryClient.setQueryData(queryKey, context.previousMessages)
    },
  })

  // Return the mutation function and its state from your custom hook
  return { editPublicMessage, isEditing }
}

export const useAddPublicMessageReaction = ({ onReactionAdded }) => {
  const queryClient = useQueryClient()
  const { authUser: currentUser } = useAuthUser()
  const queryKey = messageKeys.publicMessages()

  const { mutate: addReaction, isPending: isReacting } = useMutation({
    mutationFn: ({ messageId, emoji }) => addPublicMessageReactionApi(messageId, emoji),
    onMutate: async ({ messageId, emoji }) => {
      const previousMessages = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData || !currentUser) return oldData

        const newPages = oldData.pages.map((page) =>
          page.map((msg) => {
            if (msg._id === messageId) {
              const newReactions = [...(msg.reactions || [])]
              const existingIndex = newReactions.findIndex(
                (r) =>
                  (r.userId?._id || r.userId)?.toString() === currentUser._id.toString() &&
                  r.emoji === emoji,
              )

              const optimisticReaction = {
                emoji,
                userId: {
                  _id: currentUser._id,
                  username: currentUser.username,
                  fullName: currentUser.fullName,
                  profileImg: currentUser.profileImg,
                },
              }

              if (existingIndex !== -1) {
                newReactions.splice(existingIndex, 1)
              } else {
                newReactions.push(optimisticReaction)
              }
              return { ...msg, reactions: newReactions }
            }
            return msg
          }),
        )
        return { ...oldData, pages: newPages }
      })

      if (onReactionAdded) {
        onReactionAdded(messageId)
      }

      return { previousMessages }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(queryKey, context.previousMessages)
    },
  })

  return { addReaction, isReacting }
}

export const useBanUserFromPublicChat = () => {
  const {
    mutate: banUser,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: banUserFromPublicChatApi,
    onError: (error) => {
      showAppToast(error.message || "Failed to ban user.", "error")
    },
  })

  return { banUser, isPending, isError, error }
}

export const useUnbanUserFromPublicChat = () => {
  const {
    mutate: unbanUser,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: unbanUserFromPublicChatApi,
    onError: (error) => {
      showAppToast(error.message || "Failed to unban user.", "error")
    },
  })

  return { unbanUser, isPending, isError, error }
}
