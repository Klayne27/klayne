import { useEffect, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuthUser } from "../authHooks/useAuthUser"
import { useSocket } from "../../context/SocketContext"

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
  const MESSAGE_LIMIT = 40

  // const handleNewMessage = useCallback(
  //   (newMessage) => {
  //     const targetMessagesQueryKey = ["messages", newMessage.conversationId]

  //     queryClient.setQueryData(targetMessagesQueryKey, (oldData) => {
  //       if (!oldData || !oldData.pages || oldData.pages.length === 0) {
  //         return { pages: [[newMessage]], pageParams: [1] }
  //       }

  //       const newData = {
  //         ...oldData,
  //         pages: oldData.pages.map((page) => [...page]), // Deep copy pages to ensure immutability
  //       }
  //       const firstPage = newData.pages[0]

  //       // Handle optimistic message replacement or new message addition
  //       if (newMessage.sender._id.toString() === currentUserId.toString()) {
  //         const optimisticIndex = firstPage.findIndex(
  //           (msg) => msg.isOptimistic && msg.sender._id.toString() === currentUserId.toString(),
  //         )
  //         if (optimisticIndex !== -1) {
  //           firstPage[optimisticIndex] = newMessage
  //         } else {
  //           if (!firstPage.some((msg) => msg._id === newMessage._id)) {
  //             firstPage.push(newMessage)
  //           }
  //         }
  //       } else {
  //         if (!firstPage.some((msg) => msg._id === newMessage._id)) {
  //           firstPage.push(newMessage)
  //         }
  //       }

  //       // Limit the number of messages in the first page if needed
  //       if (firstPage.length > MESSAGE_LIMIT) {
  //         firstPage.shift()
  //       }

  //       newData.pages[0] = firstPage
  //       return newData
  //     })

  //     // --- 2. Crucial: Update the 'conversations' query cache directly ---
  //     queryClient.setQueryData(["conversations"], (oldConversations) => {
  //       if (!oldConversations) return [] // If no conversations, return empty array

  //       // Find the conversation that corresponds to the new message
  //       const conversationIndex = oldConversations.findIndex(
  //         (conv) => conv._id === newMessage.conversationId,
  //       )

  //       if (conversationIndex !== -1) {
  //         // If found, create a new array to ensure immutability
  //         const updatedConversations = [...oldConversations]
  //         const conversationToUpdate = { ...updatedConversations[conversationIndex] }

  //         // Update lastMessage and potentially seen status
  //         conversationToUpdate.lastMessage = newMessage
  //         conversationToUpdate.updatedAt = newMessage.createdAt // Also update updatedAt for sorting

  //         updatedConversations.splice(conversationIndex, 1) // Remove from current position
  //         updatedConversations.unshift(conversationToUpdate) // Add to the beginning

  //         return updatedConversations
  //       } else {
  //         console.warn(
  //           "Received message for a conversation not in cache, invalidating conversations.",
  //         )
  //         // queryClient.invalidateQueries({ queryKey: ["conversations"] })
  //         return oldConversations // Return old data for now, invalidation will handle the fetch.
  //       }
  //     })
  //     queryClient.invalidateQueries({ queryKey: ["conversations"] })
  //   },
  //   [queryClient, currentUserId, MESSAGE_LIMIT],
  // )

  const handleMessagesSeen = useCallback(
    ({ conversationId: seenConversationId, readerId }) => {
      if (seenConversationId.toString() === conversationId?.toString()) {
        queryClient.setQueryData(["messages", conversationId], (oldData) => {
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
        queryClient.invalidateQueries({ queryKey: ["conversations"] })
      }
    },
    [conversationId, queryClient, currentUserId],
  )

  const handleMessageDeleted = useCallback(
    ({ messageId, conversationId: deletedConversationId }) => {
      if (deletedConversationId.toString() === conversationId?.toString()) {
        queryClient.setQueryData(["messages", conversationId], (oldData) => {
          if (!oldData) return oldData
          const updatedPages = oldData.pages.map((page) =>
            page.filter((msg) => msg._id !== messageId),
          )
          return { ...oldData, pages: updatedPages }
        })
      }
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
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
        queryClient.setQueryData(["messages", conversationId], (oldData) => {
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
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
    },
    [conversationId, queryClient],
  )

  const handleConversationUpdated = useCallback(
    (updatedConversation) => {
      queryClient.setQueryData(["conversations"], (oldConversations) => {
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
      // queryClient.invalidateQueries({ queryKey: ["conversations"] })
    },
    [queryClient],
  )

  const handleMessageReacted = useCallback(
    ({ actorId, updatedMessage }) => {
      // You should only update the messages for the active conversation
      if (actorId === currentUser._id) {
        return
      }

      queryClient.setQueryData(["messages", updatedMessage.conversationId], (oldData) => {
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

    // socket.on("newMessage", handleNewMessage)
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
      // socket.off("newMessage", handleNewMessage)
      socket.off("messageDeleted", handleMessageDeleted)
      socket.off("messagesSeen", handleMessagesSeen)
      socket.off("typing", handleTyping)
      socket.off("stopTyping", handleStopTyping)
      socket.off("messageEdited", handleMessageEdited)
      socket.off("conversationUpdated", handleConversationUpdated)
      socket.off("messageReacted", handleMessageReacted) // 👈 Clean up the listener
    }
  }, [
    socket,
    conversationId,
    // handleNewMessage,
    handleMessageDeleted,
    handleMessagesSeen,
    handleTyping,
    handleStopTyping,
    handleMessageEdited,
    handleConversationUpdated,
    handleMessageReacted,
  ])
}
