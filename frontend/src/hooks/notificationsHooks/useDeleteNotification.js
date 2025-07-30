import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteNotificationApi } from "../../api/notificationsApi";

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  const { mutate: deleteNotification, isPending: isDeleting } = useMutation({
    mutationFn: (notificationId) => deleteNotificationApi(notificationId),
    onMutate: async (notificationIdToDelete) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousNotifications = queryClient.getQueryData(["notifications"]);

      queryClient.setQueryData(["notifications"], (oldNotifications) =>
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
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications"], context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return { deleteNotification, isDeleting };
};
