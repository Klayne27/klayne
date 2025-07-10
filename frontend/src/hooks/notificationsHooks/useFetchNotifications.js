// hooks/useFetchNotifications.jsx
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { fetchNotificationsApi } from "../../api/notificationsApi"; // Adjust path if needed
import { useSocket } from "../../context/SocketContext"; // Assuming this is your SocketContext

export const useFetchNotifications = () => {
  const { socket, setHasUnreadNotifications } = useSocket();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotificationsApi,
    onError: (err) => {
      toast.error(err.message);
    },
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (socket) {
      const handleNewNotification = (newNotification) => {
        queryClient.setQueryData(["notifications"], (oldNotifications) => {
          // Ensure oldNotifications is an array before spreading.
          // New notifications should appear at the top.
          const currentNotifications = oldNotifications || [];
          // Prevent duplicates if the backend sends a notification and it's also fetched via refetchOnWindowFocus
          const isDuplicate = currentNotifications.some(
            (notif) => notif._id === newNotification._id
          );

          if (!isDuplicate) {
            return [newNotification, ...currentNotifications];
          }
          return currentNotifications; // Return existing if duplicate
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
