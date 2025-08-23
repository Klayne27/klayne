import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchNotificationsApi } from "../../api/notificationsApi";
import { useSocket } from "../../context/SocketContext";
import { NOTIFICATIONS_QUERY_KEY } from "../../constants/queryKeys";

export const useFetchNotifications = () => {

  const { data: notifications, isLoading } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: fetchNotificationsApi,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });



  return { notifications, isLoading };
};
