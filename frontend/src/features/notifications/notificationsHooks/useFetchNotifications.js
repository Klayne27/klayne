import { useQuery } from "@tanstack/react-query";
import { notificationKeys } from "./notificationKeys";
import { fetchNotificationsApi } from "../../../api/notificationsApi";

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
