import { useEffect, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { conversationKeys } from "./conversationKeys"
import { messageKeys } from "./messageKeys"
import { showAppToast } from "../../../../utils/showAppToast"
import { useAuthUser } from "../../../auth/authHooks/useAuthUser"
import { useSocket } from "../../../../context/SocketContext"

export const usePrivateChatSocketEvents = (
  conversationId,
  setIsTypingOtherUser,
  otherUser,
  handleReactionAdded,
) => {
  const queryClient = useQueryClient()
  const { socket } = useSocket()
  const { authUser: currentUser } = useAuthUser()
  const currentUserId = currentUser?._id

  const handleMessagesSeen = useCallback(
    ({ conversationId: seenConversationId, readerId, messageCount }) => {
      if (seenConversationId.toString() === conversationId?.toString()) {
        queryClient.setQueryData(messageKeys.privateMessages(conversationId), (oldData) => {
          if (!oldData) return oldData

          let updatedCount = 0
          const updatedPages = oldData.pages.map((page) =>
            page.map((msg) => {
              if (
                msg.sender &&
                msg.sender._id.toString() === currentUserId.toString() &&
                !msg.seen &&
                !msg.isOptimistic
              ) {
                updatedCount++
                return { ...msg, seen: true }
              }
              return msg
            }),
          )

          if (updatedCount > 0) {
            return { ...oldData, pages: updatedPages }
          }
          return oldData
        })
      }
    },
    [conversationId, queryClient, currentUserId],
  )

  const handleGroupMessagesSeen = useCallback(
    ({ conversationId: seenConvId, readerId, readerUser, lastSeenMessageId }) => {
      if (seenConvId.toString() !== conversationId?.toString()) return
      if (!lastSeenMessageId) return

      queryClient.setQueryData(messageKeys.privateMessages(conversationId), (oldData) => {
        if (!oldData) return oldData

        const updatedPages = oldData.pages.map((page) =>
          page.map((msg) => {
            if (msg._id !== lastSeenMessageId) return msg

            // Avoid duplicate entries
            const alreadySeen = msg.seenBy?.some((u) => (u._id ?? u).toString() === readerId)
            if (alreadySeen) return msg

            return {
              ...msg,
              seenBy: [...(msg.seenBy || []), readerUser],
            }
          }),
        )

        return { ...oldData, pages: updatedPages }
      })
    },
    [conversationId, queryClient],
  )

  const handleMessageDeleted = useCallback(
    ({ messageId, conversationId: deletedConversationId }) => {
      if (deletedConversationId.toString() === conversationId?.toString()) {
        queryClient.setQueryData(messageKeys.privateMessages(conversationId), (oldData) => {
          if (!oldData) return oldData
          const updatedPages = oldData.pages.map((page) =>
            page.filter((msg) => msg._id !== messageId),
          )
          return { ...oldData, pages: updatedPages }
        })
      }
    },
    [conversationId, queryClient],
  )

  const handleTypingUpdate = useCallback(
    ({ conversationId: typingConvId, typingUsers: incomingTypingUsers }) => {
      if (typingConvId !== conversationId) return

      const filtered = incomingTypingUsers.filter((u) => u.userId !== currentUserId?.toString())
      setIsTypingOtherUser(filtered) 
    },
    [conversationId, currentUserId, setIsTypingOtherUser],
  )

  const handleMessageEdited = useCallback(
    (updatedMessage) => {
      if (updatedMessage.conversationId.toString() === conversationId?.toString()) {
        queryClient.setQueryData(messageKeys.privateMessages(conversationId), (oldData) => {
          if (!oldData) return oldData
          const updatedPages = oldData.pages.map((page) =>
            page.map((msg) => {
              if (msg._id === updatedMessage._id) return updatedMessage
              if (msg.repliedTo && msg.repliedTo._id === updatedMessage._id) {
                return { ...msg, repliedTo: updatedMessage }
              }
              return msg
            }),
          )
          return { ...oldData, pages: updatedPages }
        })
      }
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
    },
    [conversationId, queryClient],
  )

  const handleConversationUpdated = useCallback(
    (updatedConversation) => {
      queryClient.setQueryData(conversationKeys.list(), (oldConversations) => {
        if (!oldConversations) return [updatedConversation]
        const index = oldConversations.findIndex((conv) => conv._id === updatedConversation._id)
        if (index !== -1) {
          const newConversations = [...oldConversations]
          newConversations[index] = updatedConversation
          return newConversations
        } else {
          return [updatedConversation, ...oldConversations]
        }
      })
    },
    [queryClient],
  )

  const handleMessageReacted = useCallback(
    ({ actorId, updatedMessage }) => {
      if (actorId === currentUser._id) {
        return
      }

      queryClient.setQueryData(
        messageKeys.privateMessages(updatedMessage.conversationId),
        (oldData) => {
          if (!oldData) return oldData
          const updatedPages = oldData.pages.map((page) =>
            page.map((message) => (message._id === updatedMessage._id ? updatedMessage : message)),
          )
          return { ...oldData, pages: updatedPages }
        },
      )

      if (handleReactionAdded) {
        handleReactionAdded(updatedMessage._id)
      }
    },
    [queryClient, handleReactionAdded, currentUser?._id],
  )

  const handlePinnedMessage = useCallback(
    (newPinData) => {
      if (
        !newPinData ||
        !newPinData.pinnedBy ||
        !newPinData.message ||
        !newPinData.pinnedAt ||
        !newPinData.pinnedBy._id ||
        !newPinData.pinnedBy.username
      ) {
        console.error("Invalid or incomplete pin data structure received:", newPinData)
        return
      }

      const isValidMessageId = /^[0-9a-fA-F]{24}$/.test(newPinData.message)
      const isValidPinnedById = /^[0-9a-fA-F]{24}$/.test(newPinData.pinnedBy._id)

      if (!isValidMessageId || !isValidPinnedById) {
        console.error("Invalid ObjectId format in pin data:", {
          messageId: newPinData.message,
          pinnedById: newPinData.pinnedBy._id,
        })
        return
      }

      queryClient.setQueryData(messageKeys.pinned(conversationId), (oldData) => {
        const existingPins = oldData || []

        const isAlreadyPinned = existingPins.some(
          (pin) => pin && pin.message && pin.message.toString() === newPinData.message.toString(),
        )

        if (isAlreadyPinned) {
          return existingPins
        }

        const normalizedPinData = {
          message: newPinData.message,
          pinnedBy: {
            _id: newPinData.pinnedBy._id,
            username: newPinData.pinnedBy.username,
            fullName: newPinData.pinnedBy.fullName || newPinData.pinnedBy.username,
          },
          pinnedAt: newPinData.pinnedAt,
        }

        return [...existingPins, normalizedPinData]
      })

      showAppToast(`Message pinned by ${newPinData.pinnedBy.username}`, "success")
    },
    [queryClient, conversationId],
  )

  useEffect(() => {
    if (!socket || !conversationId) {
      return
    }

    socket.emit("joinConversation", conversationId)
    socket.emit("userActiveInChat", { conversationId: conversationId })

    socket.on("messageDeleted", handleMessageDeleted)
    socket.on("messagesSeen", handleMessagesSeen)
    socket.on("groupMessagesSeen", handleGroupMessagesSeen)

    socket.on("typing_update", handleTypingUpdate)

    socket.on("messageEdited", handleMessageEdited)
    socket.on("conversationUpdated", handleConversationUpdated)
    socket.on("messageReacted", handleMessageReacted)
    socket.on("pinnedMessage", handlePinnedMessage)

    return () => {
      socket.emit("leaveConversation", conversationId)
      socket.emit("userActiveInChat", { conversationId: null })
      socket.off("messageDeleted", handleMessageDeleted)
      socket.off("messagesSeen", handleMessagesSeen)
      socket.off("groupMessagesSeen", handleGroupMessagesSeen)
      socket.off("typing_update", handleTypingUpdate)
      socket.off("messageEdited", handleMessageEdited)
      socket.off("conversationUpdated", handleConversationUpdated)
      socket.off("messageReacted", handleMessageReacted)
      socket.off("pinnedMessage", handlePinnedMessage)

      setIsTypingOtherUser([])
    }
  }, [
    socket,
    conversationId,
    handleMessageDeleted,
    handleMessagesSeen,
    handleGroupMessagesSeen,
    handleTypingUpdate,
    handleMessageEdited,
    handleConversationUpdated,
    handleMessageReacted,
    handlePinnedMessage,
    setIsTypingOtherUser,
  ])
}
