import { useQuery } from "@tanstack/react-query";
import { fetchNotificationsApi } from "../../api/notificationsApi";
import { useSocket } from "../../context/SocketContext";
import toast from "react-hot-toast";

export const useFetchNotifications = () => {
  const { socket, setHasUnreadNotifications } = useSocket();

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
    staleTime: Infinity,
    cacheTime: Infinity,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  return { notifications, isLoading };
};
