import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteNotificationApi } from "../../api/notificationsApi";
import { notificationKeys } from "./notificationKeys";

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
