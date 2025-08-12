import { useQueryClient } from "@tanstack/react-query"
import { useSocket } from "../../context/SocketContext"
import { useAuthUser } from "../authHooks/useAuthUser"
import { useEffect } from "react"

export const useGlobalPublicChatSocketEvents = () => {
  const queryClient = useQueryClient()
  const { socket } = useSocket()
  const { authUser: currentUser } = useAuthUser()

  useEffect(() => {
    if (!socket || !currentUser) return

    const handleNewPublicMessage = (newMessage) => {
      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return { pages: [[newMessage]], pageParams: [1] }
        }

        const newPages = oldData.pages.map((page) => [...page])
        const mostRecentPage = newPages[0]

        if (newMessage.sender._id === currentUser._id) {
          const optimisticIndex = mostRecentPage.findIndex((msg) => msg.isOptimistic)
          if (optimisticIndex !== -1) {
            mostRecentPage[optimisticIndex] = newMessage
          } else {
            if (!mostRecentPage.some((msg) => msg._id === newMessage._id)) {
              mostRecentPage.push(newMessage)
            }
          }
        } else {
          if (!mostRecentPage.some((msg) => msg._id === newMessage._id)) {
            mostRecentPage.push(newMessage)
          }
        }
        return { ...oldData, pages: newPages }
      })
    }

    socket.on("newPublicMessage", handleNewPublicMessage)

    return () => {
      socket.off("newPublicMessage", handleNewPublicMessage)
    }
  }, [queryClient, socket, currentUser?._id])
}
