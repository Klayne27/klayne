import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteNotificationApi } from "../../api/notificationsApi";
import { NOTIFICATIONS_QUERY_KEY } from "../../constants/queryKeys";

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  const { mutate: deleteNotification, isPending: isDeleting } = useMutation({
    mutationFn: (notificationId) => deleteNotificationApi(notificationId),
    onMutate: async (notificationIdToDelete) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });

      const previousNotifications = queryClient.getQueryData(NOTIFICATIONS_QUERY_KEY);

      queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, (oldNotifications) =>
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
        queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, context.previousNotifications);
    },

  });

  return { deleteNotification, isDeleting };
};
