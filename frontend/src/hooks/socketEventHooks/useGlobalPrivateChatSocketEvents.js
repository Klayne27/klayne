import { useEffect, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSocket } from "../../context/SocketContext"
import { useAuthUser } from "../authHooks/useAuthUser"
import { CONVERSATIONS_QUERY_KEY } from "../../constants/queryKeys"

export const useGlobalPrivateChatSocketEvents = () => {
  const queryClient = useQueryClient()
  const { socket } = useSocket()
  const { authUser: currentUser } = useAuthUser()

  const handleNewMessage = useCallback(
    (newMessage) => {
      const messagesQueryKey = ["messages", newMessage.conversationId]

      const messagesCache = queryClient.getQueryData(messagesQueryKey)
      if (messagesCache) {
        queryClient.setQueryData(messagesQueryKey, (oldData) => {
          const newData = {
            ...oldData,
            pages: oldData.pages.map((page, index) => (index === 0 ? [...page, newMessage] : page)),
          }
          return newData
        })
      }

      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY })
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
