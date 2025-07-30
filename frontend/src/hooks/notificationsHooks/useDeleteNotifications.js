import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteNotificationsApi } from "../../api/notificationsApi";

export const useDeleteNotifications = () => {
  const queryClient = useQueryClient();

  const { mutate: deleteNotifications, isPending: isDeleting } = useMutation({
    mutationFn: deleteNotificationsApi,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousNotifications = queryClient.getQueryData(["notifications"]);

      queryClient.setQueryData(["notifications"], []);

      return { previousNotifications };
    },
    onError: (error, variables, context) => {
      console.error("Delete all notifications error:", error);
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications"], context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return { deleteNotifications, isDeleting };
};
