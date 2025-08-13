import { useQueryClient } from "@tanstack/react-query"
import { useSocket } from "../../context/SocketContext"
import { useAuthUser } from "../authHooks/useAuthUser"
import { useEffect, useCallback } from "react"

export const useGlobalPublicChatSocketEvents = () => {
  const queryClient = useQueryClient()
  const { socket } = useSocket()
  const { authUser: currentUser } = useAuthUser()

  const handleNewPublicMessage = useCallback(
    (newMessage) => {
      const queryKey = ["publicMessages"]

      if (newMessage.sender._id === currentUser._id) {
        return
      }

      // --- START FIX ---
      // First, check if the public messages cache has any data yet.
      const publicMessagesCache = queryClient.getQueryData(queryKey)

      // Only update the cache if it's already populated.
      if (publicMessagesCache) {
        queryClient.setQueryData(queryKey, (oldData) => {
          if (!oldData || !oldData.pages) return oldData // Should not happen if cache exists, but safe

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
