import { useMutation, useQueryClient } from "@tanstack/react-query"
import { messageKeys } from "../../common/hooks/messageKeys"
import { conversationKeys } from "../../common/hooks/conversationKeys"
import { usePrivateChatStore } from "../../../../store/usePrivateChatStore"
import { useAuthUser } from "../../../auth/authHooks/useAuthUser"
import {
  deleteAllMessagesOnMySideApi,
  deleteConversationApi,
  deleteMessageApi,
  editMessageApi,
  muteConversationApi,
  pinMessageApi,
  reactToMessageApi,
  sendMessageApi,
  toggleConversationVisibilityApi,
  unpinMessageApi,
} from "../../../../api/privateChatApi"
import { showAppToast } from "../../../../utils/showAppToast"
import { userKeys } from "../../../users/usersHooks/userKeys"

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
        audio: newMessageData.voiceMessage || null, 
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
                audio: optimisticMessage.audio, 
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
      queryClient.setQueryData(context.messagesQueryKey, context.previousMessages)
      queryClient.setQueryData(context.conversationQueryKey, context.previousConversations)
    },
  })

  return { sendPrivateMessage, isSendingMessage }
}

export const useDeleteMessage = () => {
  const queryClient = useQueryClient()

  const { mutate: deleteMessage } = useMutation({
    mutationFn: deleteMessageApi,
    onMutate: async ({ messageId, conversationId }) => {
      const queryKey = messageKeys.privateMessages(conversationId)

      await queryClient.cancelQueries({ queryKey: queryKey })

      const previousMessagesData = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData || !oldData.pages) {
          return oldData
        }

        const updatedPages = oldData.pages.map((page) =>
          page.filter((msg) => msg._id !== messageId),
        )

        return { ...oldData, pages: updatedPages }
      })

      return { previousMessagesData, messageId, conversationId }
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(
        messageKeys.privateMessages(context.conversationId),
        context.previousMessagesData,
      )
      showAppToast(error.message || "Failed to delete message.", "error")
    },
  })

  return { deleteMessage }
}

export const useEditMessage = (conversationId) => {
  const queryClient = useQueryClient()

  const { mutate: editPrivateMessage, isPending: isEditing } = useMutation({
    mutationFn: ({ messageId, newText }) => editMessageApi(messageId, newText),
    onMutate: async ({ messageId, newText }) => {
      const messagesQueryKey = messageKeys.privateMessages(conversationId)
      const conversationQueryKey = conversationKeys.list()

      await queryClient.cancelQueries({ queryKey: messagesQueryKey })

      const previousMessagesData = queryClient.getQueryData(messagesQueryKey)

      queryClient.setQueryData(messagesQueryKey, (oldData) => {
        if (!oldData || !oldData.pages) return oldData

        const updatedPages = oldData.pages.map((page) =>
          page.map((msg) =>
            msg._id === messageId
              ? {
                  ...msg,
                  text: newText,
                  isEdited: true,
                  img: msg.img,
                  image: msg.image,
                }
              : msg,
          ),
        )

        return { ...oldData, pages: updatedPages }
      })

      queryClient.setQueryData(conversationQueryKey, (oldData) => {
        if (!oldData) return oldData

        return oldData
      })

      return { previousMessagesData, messagesQueryKey }
    },
    onError: (error, variables, context) => {
      showAppToast("Failed to update message: " + error.message, "error")
      queryClient.setQueryData(context.messagesQueryKey, context.previousMessagesData)
    },
  })

  return { editPrivateMessage, isEditing }
}

export const usePinMessage = () => {
  const queryClient = useQueryClient()
  const { mutate: pinMessage, isPending: isPinningMessage } = useMutation({
    mutationFn: pinMessageApi,
    onSuccess: (data, variables) => {
      showAppToast("Message pinned", "success")
      queryClient.invalidateQueries({ queryKey: messageKeys.pinned(variables.conversationId) })
    },
  })

  return { pinMessage, isPinningMessage }
}

export const useReactToMessage = ({ selectedConversationId, onReactionAdded }) => {
  const queryClient = useQueryClient()
  const { authUser: currentUser } = useAuthUser()

  const { mutate: reactToMessage } = useMutation({
    mutationFn: ({ messageId, emoji }) => reactToMessageApi(messageId, emoji),

    onMutate: async ({ messageId, emoji }) => {
      await queryClient.cancelQueries({
        queryKey: messageKeys.privateMessages(selectedConversationId),
      })
      const previousMessages = queryClient.getQueryData(
        messageKeys.privateMessages(selectedConversationId),
      )

      queryClient.setQueryData(messageKeys.privateMessages(selectedConversationId), (oldData) => {
        if (!oldData || !currentUser) return oldData
        const userId = currentUser._id
        const updatedPages = oldData.pages.map((page) =>
          page.map((message) => {
            if (message._id === messageId) {
              const newReactions = [...message.reactions]
              const existingReactionIndex = newReactions.findIndex(
                (r) =>
                  (r.userId?._id || r.userId)?.toString() === userId.toString() &&
                  r.emoji === emoji,
              )

              if (existingReactionIndex !== -1) {
                newReactions.splice(existingReactionIndex, 1)
              } else {
                newReactions.push({
                  _id: `optimistic-${Date.now()}-${userId}-${emoji}`,
                  emoji: emoji,
                  userId: {
                    _id: userId,
                    username: currentUser.username,
                    fullName: currentUser.fullName,
                    profileImg: currentUser.profileImg,
                  },
                })
              }
              return { ...message, reactions: newReactions }
            }
            return message
          }),
        )
        return { ...oldData, pages: updatedPages }
      })

      if (onReactionAdded) {
        onReactionAdded(messageId)
      }

      return { previousMessages }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(
        messageKeys.privateMessages(selectedConversationId),
        context.previousMessages,
      )
      showAppToast(err.message || "Failed to react.", "error")
    },
  })

  return { reactToMessage }
}

export const useUnpinMessage = () => {
  const queryClient = useQueryClient()

  const { mutate: unpinMessage, isPending: isUnpinning } = useMutation({
    mutationFn: unpinMessageApi,
    onSuccess: (data, variables) => {
      showAppToast("Message unpinned", "success")

      queryClient.setQueryData(messageKeys.pinned(variables.conversationId), (oldData) => {
        if (!oldData) return []

        return oldData.filter(
          (pin) =>
            pin &&
            pin.message &&
            pin.message._id !== variables.messageId &&
            pin.message !== variables.messageId,
        )
      })

      queryClient.invalidateQueries({
        queryKey: messageKeys.pinned(variables.conversationId),
      })
    },
    onError: (error, variables) => {
      console.error("Failed to unpin message:", error)
      showAppToast(error?.message || "Failed to unpin message", "error")
    },
  })

  return { unpinMessage, isUnpinning }
}

export const useDeleteAllMessagesOnMySide = () => {
  const queryClient = useQueryClient()

  const { mutateAsync: deleteAllMessages } = useMutation({
    mutationFn: (conversationId) => deleteAllMessagesOnMySideApi(conversationId),
    onMutate: async (conversationId) => {
      const messagesQueryKey = messageKeys.privateMessages(conversationId)
      const conversationsQueryKey = conversationKeys.list()

      await queryClient.cancelQueries({ queryKey: messagesQueryKey })
      await queryClient.cancelQueries({ queryKey: conversationsQueryKey })

      const previousMessages = queryClient.getQueryData(messagesQueryKey)
      const previousConversations = queryClient.getQueryData(conversationsQueryKey)

      queryClient.setQueryData(messagesQueryKey, {
        pages: [[]],
        pageParams: [undefined],
      })

      queryClient.setQueryData(conversationsQueryKey, (oldData) => {
        if (!oldData) return oldData
        return oldData.map((conversation) => {
          if (conversation._id === conversationId) {
            return { ...conversation, lastMessage: null }
          }
          return conversation
        })
      })

      return { previousMessages, previousConversations, conversationId }
    },
    onSuccess: (data) => {
      showAppToast(data.message, "success")
    },
    onError: (error, variables, context) => {
      showAppToast(error.message, "error")

      queryClient.setQueryData(
        messageKeys.privateMessages(context.conversationId),
        context.previousMessages,
      )
      queryClient.setQueryData(conversationKeys.list(), context.previousConversations)
    },
  })

  return { deleteAllMessages }
}

export const useDeleteConversation = () => {
  const queryClient = useQueryClient()
  const queryKey = conversationKeys.list()

  const { mutate: deleteConversation, isPending } = useMutation({
    mutationFn: (conversationId) => deleteConversationApi(conversationId),
    onMutate: async (conversationIdToDelete) => {
      await queryClient.cancelQueries({ queryKey: queryKey })

      const previousConversations = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (oldConversations) =>
        oldConversations?.filter((conversation) => conversation._id !== conversationIdToDelete),
      )

      return { previousConversations }
    },
    onSuccess: () => {
      showAppToast("Conversation deleted successfully", "success")
    },
    onError: (error, conversationIdToDelete, context) => {
      showAppToast(`Failed to delete conversation: ${error.message}`, "error")
      queryClient.setQueryData(queryKey, context.previousConversations)
    },
  })

  return { deleteConversation, isPending }
}

export const useToggleConversationVisibility = () => {
  const queryClient = useQueryClient()

  const { mutate: toggleVisibility, isPending: isTogglingVisibility } = useMutation({
    mutationFn: ({ conversationId }) => toggleConversationVisibilityApi(conversationId),

    onMutate: async ({ conversationId }) => {
      await queryClient.cancelQueries({ queryKey: conversationKeys.list() })

      const previousConversations = queryClient.getQueryData(conversationKeys.list())

      if (!previousConversations) {
        return
      }

      queryClient.setQueryData(conversationKeys.list(), (oldData) => {
        if (!Array.isArray(oldData)) {
          return oldData
        }
        return oldData.filter((conv) => conv._id !== conversationId)
      })

      return { previousConversations }
    },

    onError: (err, variables, context) => {
      queryClient.setQueryData(conversationKeys.list(), context.previousConversations)
      showAppToast(err.message || "Failed to hide conversation.", "error")
    },
  })

  return { toggleVisibility, isTogglingVisibility }
}

export const useMuteConversation = () => {
  const queryClient = useQueryClient()

  const { mutate: muteConversation, isPending: isMutingConversation } = useMutation({
    mutationFn: muteConversationApi,

    // Optimistic: flip the conversationId in auth cache
    onMutate: async (conversationId) => {
      await queryClient.cancelQueries({ queryKey: userKeys.auth() })
      const previousAuth = queryClient.getQueryData(userKeys.auth())

      queryClient.setQueryData(userKeys.auth(), (old) => {
        if (!old) return old
        const muted = old.mutedConversations ?? []
        const alreadyMuted = muted.some((id) => id === conversationId || id?.toString?.() === conversationId)
        return {
          ...old,
          mutedConversations: alreadyMuted
            ? muted.filter((id) => (id?.toString?.() ?? id) !== conversationId)
            : [...muted, conversationId],
        }
      })

      return { previousAuth }
    },

    onError: (err, _, context) => {
      if (context?.previousAuth) {
        queryClient.setQueryData(userKeys.auth(), context.previousAuth)
      }
      showAppToast(err.message || "Failed to update mute", "error")
    },

    onSuccess: (data) => {
      showAppToast(data.muted ? "Conversation muted" : "Conversation unmuted")
      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
    },
  })

  return { muteConversation, isMutingConversation }
}