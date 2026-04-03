import { useQueryClient } from "@tanstack/react-query"
import { useSocket } from "../../context/SocketContext"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { useEffect, useCallback } from "react"
import { messageKeys } from "../../features/chat/hooks/messageKeys"

export const useGlobalPublicChatSocketEvents = () => {
  const queryClient = useQueryClient()
  const { socket } = useSocket()
  const { authUser: currentUser } = useAuthUser()

  const handleNewPublicMessage = useCallback(
    (newMessage) => {
      const queryKey = messageKeys.publicMessages()

      if (newMessage.sender._id === currentUser._id) {
        return
      }
      const publicMessagesCache = queryClient.getQueryData(queryKey)

      if (publicMessagesCache) {
        queryClient.setQueryData(queryKey, (oldData) => {
          if (!oldData || !oldData.pages) return oldData 

          const newPages = oldData.pages.map((page) => [...page])
          const mostRecentPage = newPages[0] // Newest messages are on the first page

          // Check if the message isn't already in the list to prevent duplicates
          if (!mostRecentPage.some((msg) => msg._id === newMessage._id)) {
            mostRecentPage.push(newMessage)
          }

          return { ...oldData, pages: newPages }
        })
      }
      // If the cache is empty, do nothing. Let usePublicMessages handle the initial fetch.
      // --- END FIX ---
    },
    [queryClient, currentUser],
  )

  useEffect(() => {
    if (!socket || !currentUser) return

    socket.on("newPublicMessage", handleNewPublicMessage)

    return () => {
      socket.off("newPublicMessage", handleNewPublicMessage)
    }
  }, [socket, currentUser, handleNewPublicMessage])
}
