import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchNotificationsApi } from "../../api/notificationsApi";
import { useSocket } from "../../context/SocketContext";
import toast from "react-hot-toast";
import { useEffect } from "react";

export const useFetchNotifications = () => {
  const { socket, setHasUnreadNotifications } = useSocket();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotificationsApi, // REMOVE or modify this onSuccess callback // If you *must* mark them as read when fetched, do it on the backend, // or ensure this does not trigger a subsequent refetch of authUser. // A better approach is often to have a separate mutation for "mark all notifications as read" // that the user explicitly triggers, or that is triggered only once when the notifications // page is *first* loaded, not on every re-focus.
    onSuccess: (data) => {
      // Option 1 (Recommended): Remove this entirely if marking as read is handled elsewhere
      // (e.g., when user clicks 'mark all read' button)
      // Or, ensure that fetchNotificationsApi itself marks them as read on the backend
      // if you want them automatically marked as read upon fetching.
      // If fetchNotificationsApi *does* mark them as read, then the backend's
      // emitUnreadNotificationStatus would correctly send `false`.
      // This means you don't need `socket.emit("markNotificationsAsRead");` here.
      // Option 2 (If you absolutely want to mark as read on fetch):
      // Only emit if there are actually unread notifications in the fetched data.
      // And even then, reconsider if this is the right place for this side effect.
      // If the backend correctly updates the `unreadNotificationStatus` based on the database,
      // then the `setHasUnreadNotifications(false)` below isn't strictly necessary either,
      // as the socket event should handle it.
      // Let's remove the socket emit here to break the loop:
      // if (socket) {
      //  socket.emit("markNotificationsAsRead");
      // }
      // This setHasUnreadNotifications(false) will be handled by the socket listener
      // for "unreadNotificationStatus" when the backend responds after marking as read.
      // setHasUnreadNotifications(false);
    },
    onError: (err) => {
      toast.error(err.message);
    },
    retry: false,
    refetchOnWindowFocus: true, // Keep this if you want notifications to refresh when tab is active
    refetchOnMount: true, // Keep this if you want notifications to refresh when component mounts
  });

  useEffect(() => {
    if (socket) {
      const handleNewNotification = (newNotification) => {
        queryClient.setQueryData(["notifications"], (oldNotifications) => {
          // Ensure oldNotifications is an array before spreading
          if (!oldNotifications) return [newNotification];
          return [newNotification, ...oldNotifications];
        });
        setHasUnreadNotifications(true); // This correctly updates the badge
      };

      socket.on("newNotification", handleNewNotification);

      return () => {
        socket.off("newNotification", handleNewNotification);
      };
    }
  }, [socket, queryClient, setHasUnreadNotifications]);

  return { notifications, isLoading };
};
