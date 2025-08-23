import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteNotificationsApi } from "../../api/notificationsApi";
import { NOTIFICATIONS_QUERY_KEY } from "../../constants/queryKeys";

export const useDeleteNotifications = () => {
  const queryClient = useQueryClient();

  const { mutate: deleteNotifications, isPending: isDeleting } = useMutation({
    mutationFn: deleteNotificationsApi,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });

      const previousNotifications = queryClient.getQueryData(NOTIFICATIONS_QUERY_KEY);

      queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, []);

      return { previousNotifications };
    },
    onError: (error, variables, context) => {
      console.error("Delete all notifications error:", error);
        queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, context.previousNotifications);
    },

  });

  return { deleteNotifications, isDeleting };
};
