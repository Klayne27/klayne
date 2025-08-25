import { useEffect, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSocket } from "../../context/SocketContext"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { messageKeys } from "../../features/chat/private/privateChatHooks/messageKeys"
import { conversationKeys } from "../../features/chat/private/privateChatHooks/conversationKeys"

export const useGlobalPrivateChatSocketEvents = () => {
  const queryClient = useQueryClient()
  const { socket } = useSocket()
  const { authUser: currentUser } = useAuthUser()

  const handleNewMessage = useCallback(
    (newMessage) => {
      const messagesQueryKey = messageKeys.privateMessages(newMessage.conversationId)

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

      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
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
