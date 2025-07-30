import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchNotificationsApi } from "../../api/notificationsApi";
import { useSocket } from "../../context/SocketContext";

export const useFetchNotifications = () => {
  const { socket, setHasUnreadNotifications } = useSocket();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotificationsApi,
    onError: (err) => {
      // showAppToast(err.message);
    },
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (socket) {
      const handleNewNotification = (newNotification) => {
        queryClient.setQueryData(["notifications"], (oldNotifications) => {
          const currentNotifications = oldNotifications || [];
          const isDuplicate = currentNotifications.some(
            (notif) => notif._id === newNotification._id
          );

          if (!isDuplicate) {
            return [newNotification, ...currentNotifications];
          }
          return currentNotifications;
        });
        setHasUnreadNotifications(true);
      };

      socket.on("newNotification", handleNewNotification);

      return () => {
        socket.off("newNotification", handleNewNotification);
      };
    }
  }, [socket, queryClient, setHasUnreadNotifications]);

  return { notifications, isLoading };
};
