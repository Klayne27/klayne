import { useQuery } from "@tanstack/react-query";
import { fetchNotificationsApi } from "../../api/notificationsApi";

export const useFetchNotifications = () => {
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotificationsApi,
    retry: false,
    staleTime: Infinity,
    cacheTime: Infinity,
    refetchOnWindowFocus: false, 
    refetchOnMount: true,
  });

  return { notifications, isLoading };
};
