import { useEffect, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { useSocket } from "../../context/SocketContext"
import { messageKeys } from "../../features/chat/private/privateChatHooks/messageKeys"
import { conversationKeys } from "../../features/chat/private/privateChatHooks/conversationKeys"

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
    ({ conversationId: seenConversationId, readerId }) => {
      if (seenConversationId.toString() === conversationId?.toString()) {
        queryClient.setQueryData(messageKeys.privateMessages(conversationId), (oldData) => {
          if (!oldData) return oldData
          const updatedPages = oldData.pages.map((page) =>
            page.map((msg) =>
              msg.sender && msg.sender._id.toString() === currentUserId.toString() && !msg.seen
                ? { ...msg, seen: true }
                : msg,
            ),
          )
          return { ...oldData, pages: updatedPages }
        })
        // queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
      }
    },
    [conversationId, queryClient, currentUserId],
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
      // queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
    },
    [conversationId, queryClient],
  )

  const handleTyping = useCallback(
    ({ conversationId: typingConvId, userId, isEditing }) => {
      if (typingConvId === conversationId && userId === otherUser._id.toString()) {
        setIsTypingOtherUser(true)
      }
    },
    [conversationId, setIsTypingOtherUser, otherUser?._id],
  )

  const handleStopTyping = useCallback(
    ({ conversationId: stopTypingConvId, userId, isEditing }) => {
      if (stopTypingConvId === conversationId && userId === otherUser?._id.toString()) {
        setIsTypingOtherUser(false)
      }
    },
    [conversationId, otherUser?._id, setIsTypingOtherUser],
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
      // queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
    },
    [queryClient],
  )

  const handleMessageReacted = useCallback(
    ({ actorId, updatedMessage }) => {
      // You should only update the messages for the active conversation
      if (actorId === currentUser._id) {
        return
      }

      queryClient.setQueryData(messageKeys.privateMessages(updatedMessage.conversationId), (oldData) => {
        if (!oldData) return oldData
        const updatedPages = oldData.pages.map((page) =>
          page.map((message) => (message._id === updatedMessage._id ? updatedMessage : message)),
        )
        return { ...oldData, pages: updatedPages }
      })

      if (handleReactionAdded) {
        handleReactionAdded(updatedMessage._id)
      }
    },
    [queryClient, handleReactionAdded, currentUser?._id],
  )

  useEffect(() => {
    if (!socket || !conversationId) {
      console.log("Socket or conversationId not available for private chat, skipping setup.")
      return
    }

    socket.emit("joinConversation", conversationId)
    socket.emit("userActiveInChat", { conversationId: conversationId })

    socket.on("messageDeleted", handleMessageDeleted)
    socket.on("messagesSeen", handleMessagesSeen)
    socket.on("typing", handleTyping)
    socket.on("stopTyping", handleStopTyping)
    socket.on("messageEdited", handleMessageEdited)
    socket.on("conversationUpdated", handleConversationUpdated)
    socket.on("messageReacted", handleMessageReacted)

    return () => {
      socket.emit("leaveConversation", conversationId)
      socket.emit("userActiveInChat", { conversationId: null })
      socket.off("messageDeleted", handleMessageDeleted)
      socket.off("messagesSeen", handleMessagesSeen)
      socket.off("typing", handleTyping)
      socket.off("stopTyping", handleStopTyping)
      socket.off("messageEdited", handleMessageEdited)
      socket.off("conversationUpdated", handleConversationUpdated)
      socket.off("messageReacted", handleMessageReacted)
    }
  }, [
    socket,
    conversationId,
    handleMessageDeleted,
    handleMessagesSeen,
    handleTyping,
    handleStopTyping,
    handleMessageEdited,
    handleConversationUpdated,
    handleMessageReacted,
  ])
}
