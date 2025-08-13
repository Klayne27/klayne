import { useEffect, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSocket } from "../../context/SocketContext"
import { useAuthUser } from "../authHooks/useAuthUser"

export const useGlobalPrivateChatSocketEvents = () => {
  const queryClient = useQueryClient()
  const { socket } = useSocket()
  const { authUser: currentUser } = useAuthUser()

  const handleNewMessage = useCallback(
    (newMessage) => {
      const messagesQueryKey = ["messages", newMessage.conversationId]
      const conversationsQueryKey = ["conversations"]

      // ✅ --- START FIX ---
      // Only update the messages cache IF it already has data.
      // This prevents creating an incomplete cache for unseen conversations.
      const messagesCache = queryClient.getQueryData(messagesQueryKey)
      if (messagesCache) {
        queryClient.setQueryData(messagesQueryKey, (oldData) => {
          // This logic is for an already active/cached chat.
          // It correctly appends the new message to the first (newest) page.
          const newData = {
            ...oldData,
            pages: oldData.pages.map((page, index) => (index === 0 ? [...page, newMessage] : page)),
          }
          return newData
        })
      }
      // If messagesCache is undefined, we do nothing. The useFetchMessages hook
      // will now correctly perform its initial fetch when the chat is opened.
      // ✅ --- END FIX ---

      // This logic updates the conversation list, which is correct.
      // queryClient.setQueryData(conversationsQueryKey, (oldConversations) => {
      //   if (!oldConversations) {
      //     queryClient.invalidateQueries({ queryKey: conversationsQueryKey })
      //     return []
      //   }

      //   const conversationIndex = oldConversations.findIndex(
      //     (conv) => conv._id === newMessage.conversationId,
      //   )

      //   const updatedConversations = oldConversations.map((c) => ({ ...c }))
      //   let conversationToUpdate

      //   if (conversationIndex !== -1) {
      //     // Conversation exists, so we update its last message and move it to the top.
      //     conversationToUpdate = {
      //       ...updatedConversations[conversationIndex],
      //       lastMessage: {
      //         text: newMessage.text,
      //         img: newMessage.img,
      //         sender: newMessage.sender._id,
      //         seen: false, // Always mark as unseen in the list on new message
      //         messageId: newMessage._id,
      //       },
      //       updatedAt: newMessage.createdAt,
      //     }
      //     updatedConversations.splice(conversationIndex, 1)
      //   } else {
      //     // This is a completely new conversation. Invalidate the query to fetch
      //     // the full list again, which will include this new conversation.
      //     console.warn("Received message for a new conversation. Refetching list.")
      //     queryClient.invalidateQueries({ queryKey: conversationsQueryKey })
      //     return oldConversations // Return old data; invalidation will trigger a fresh fetch.
      //   }

      //   // Add the updated or new conversation to the front of the array.
      //   return [conversationToUpdate, ...updatedConversations]
      // })
      queryClient.invalidateQueries({ queryKey: conversationsQueryKey })
    },
    [queryClient],
  )

  useEffect(() => {
    if (!socket || !currentUser) return

    socket.on("newMessage", handleNewMessage)

    return () => {
      socket.off("newMessage", handleNewMessage)
    }
  }, [socket, currentUser, handleNewMessage, queryClient])
}
