import { useQuery } from "@tanstack/react-query";
import { fetchNotificationsApi } from "../../api/notificationsApi";
import { notificationKeys } from "./notificationKeys";

export const useFetchNotifications = () => {

  const { data: notifications, isLoading } = useQuery({
    queryKey: notificationKeys.list(),
    queryFn: fetchNotificationsApi,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });



  return { notifications, isLoading };
};
