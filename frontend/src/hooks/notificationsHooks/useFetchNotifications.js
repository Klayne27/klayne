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
    queryFn: fetchNotificationsApi,
    onSuccess: () => {
      if (socket) {
        socket.emit("markNotificationsAsRead");
      }
      setHasUnreadNotifications(false);
    },
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
          if (!oldNotifications) return [newNotification];
          return [newNotification, ...oldNotifications];
        });
        toast.info("New notification!");
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

