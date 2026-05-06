import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { useSocket } from "../../context/SocketContext"
import { notificationKeys } from "../../features/notifications/notificationsHooks/notificationKeys"
import { userKeys } from "../../features/users/usersHooks/userKeys"

export const useGlobalNotificationSocketEvent = () => {
  const { socket, setHasUnreadNotifications, setFollowRequestCount } = useSocket()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (socket) {
      const handleNewNotification = (newNotification) => {
        queryClient.setQueryData(notificationKeys.list(), (oldNotifications) => {
          const currentNotifications = oldNotifications || []
          const isDuplicate = currentNotifications.some(
            (notif) => notif._id === newNotification._id,
          )

          if (!isDuplicate) {
            return [newNotification, ...currentNotifications]
          }
          return currentNotifications
        })
        setHasUnreadNotifications(true)
      }

      const handleNewFollowRequest = ({ count }) => {
        setFollowRequestCount(count)
        queryClient.invalidateQueries({ queryKey: userKeys.followRequests() })
      }

      socket.on("followRequestCount", handleNewFollowRequest)
      socket.on("newNotification", handleNewNotification)

      return () => {
        socket.off("newNotification", handleNewNotification)
        socket.off("followRequestCount", handleNewFollowRequest)
      }
    }
  }, [socket, queryClient, setHasUnreadNotifications, setFollowRequestCount])
}
