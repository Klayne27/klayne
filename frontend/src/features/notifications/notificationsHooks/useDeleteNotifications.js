import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationKeys } from "./notificationKeys";
import { deleteNotificationsApi } from "../../../api/notificationsApi";

export const useDeleteNotifications = () => {
  const queryClient = useQueryClient();

  const { mutate: deleteNotifications, isPending: isDeleting } = useMutation({
    mutationFn: deleteNotificationsApi,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() });

      const previousNotifications = queryClient.getQueryData(notificationKeys.list());

      queryClient.setQueryData(notificationKeys.list(), []);

      return { previousNotifications };
    },
    onError: (error, variables, context) => {
      console.error("Delete all notifications error:", error);
        queryClient.setQueryData(notificationKeys.list(), context.previousNotifications);
    },

  });

  return { deleteNotifications, isDeleting };
};
