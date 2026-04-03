import { useQuery } from "@tanstack/react-query"
import { notificationKeys } from "./notificationKeys"
import { deleteNotificationApi, getNotificationsApi } from "../../../api/notificationsApi"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteNotificationsApi } from "../../../api/notificationsApi"

export const useGetNotifications = () => {
  const { data: notifications, isLoading } = useQuery({
    queryKey: notificationKeys.list(),
    queryFn: getNotificationsApi,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  return { notifications, isLoading }
}

export const useDeleteNotifications = () => {
  const queryClient = useQueryClient()

  const { mutate: deleteNotifications, isPending: isDeleting } = useMutation({
    mutationFn: deleteNotificationsApi,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() })

      const previousNotifications = queryClient.getQueryData(notificationKeys.list())

      queryClient.setQueryData(notificationKeys.list(), [])

      return { previousNotifications }
    },
    onError: (error, variables, context) => {
      console.error("Delete all notifications error:", error)
      queryClient.setQueryData(notificationKeys.list(), context.previousNotifications)
    },
  })

  return { deleteNotifications, isDeleting }
}

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  const { mutate: deleteNotification, isPending: isDeleting } = useMutation({
    mutationFn: (notificationId) => deleteNotificationApi(notificationId),
    onMutate: async (notificationIdToDelete) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() });

      const previousNotifications = queryClient.getQueryData(notificationKeys.list());

      queryClient.setQueryData(notificationKeys.list(), (oldNotifications) =>
        oldNotifications
          ? oldNotifications.filter(
              (notification) => notification._id !== notificationIdToDelete
            )
          : []
      );

      return { previousNotifications };
    },
    onError: (error, notificationIdToDelete, context) => {
      console.error("Delete notification error:", error);
        queryClient.setQueryData(notificationKeys.list(), context.previousNotifications);
    },

  });

  return { deleteNotification, isDeleting };
};