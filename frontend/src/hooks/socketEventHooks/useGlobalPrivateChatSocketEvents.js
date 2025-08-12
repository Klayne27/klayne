import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSocket } from "../../context/SocketContext"
import { useAuthUser } from "../authHooks/useAuthUser"

export const useGlobalPrivateChatSocketEvents = () => {
  const queryClient = useQueryClient()
  const { socket } = useSocket()
  const { authUser: currentUser } = useAuthUser()

  useEffect(() => {
    if (!socket || !currentUser) return

    const handleNewMessage = (newMessage) => {
      const messagesQueryKey = ["messages", newMessage.conversationId]
      const conversationsQueryKey = ["conversations"]

      // 1. Update the specific message list cache
      queryClient.setQueryData(messagesQueryKey, (oldData) => {
        // If the chat history for this convo isn't cached yet, create it.
        if (!oldData || !oldData.pages) {
          return { pages: [[newMessage]], pageParams: [undefined] }
        }

        const newData = {
          ...oldData,
          pages: oldData.pages.map((page, index) =>
            // ✅ FIX: Correctly APPEND the new message to the first page (most recent)
            index === 0 ? [...page, newMessage] : [...page],
          ),
        }

        return newData
      })

      // 2. Update the conversations list to show the new lastMessage and move it to the top
      queryClient.setQueryData(conversationsQueryKey, (oldConversations) => {
        if (!oldConversations) return []

        const conversationIndex = oldConversations.findIndex(
          (conv) => conv._id === newMessage.conversationId,
        )

        // Create a deep copy to work with
        const updatedConversations = oldConversations.map((c) => ({ ...c }))

        let conversationToUpdate

        if (conversationIndex !== -1) {
          // Conversation exists, update and remove from its current position
          conversationToUpdate = {
            ...updatedConversations[conversationIndex],
            lastMessage: {
              text: newMessage.text,
              img: newMessage.img,
              sender: newMessage.sender._id,
              seen: false, // Assume unseen for the list item
              messageId: newMessage._id,
            },
            updatedAt: newMessage.createdAt,
          }
          updatedConversations.splice(conversationIndex, 1)
        } else {
          // This case is for a brand new conversation.
          // You might need a separate event or to fetch conversation details here.
          // For now, we'll invalidate to be safe.
          console.warn("Received message for a completely new conversation. Refetching list.")
          queryClient.invalidateQueries({ queryKey: conversationsQueryKey })
          return oldConversations
        }

        // Move the updated conversation to the top of the list
        return [conversationToUpdate, ...updatedConversations]
      })
    }



    socket.on("newMessage", handleNewMessage)

    return () => {
      socket.off("newMessage", handleNewMessage)
    }
  }, [socket, queryClient, currentUser])
}
