import { useQuery } from "@tanstack/react-query";
import { notificationKeys } from "./notificationKeys";
import { getNotificationsApi } from "../../../api/notificationsApi";

export const useGetNotifications = () => {

  const { data: notifications, isLoading } = useQuery({
    queryKey: notificationKeys.list(),
    queryFn: getNotificationsApi,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  return { notifications, isLoading };
};
