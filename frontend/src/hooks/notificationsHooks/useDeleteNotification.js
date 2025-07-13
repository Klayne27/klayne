import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteNotificationApi } from "../../api/notificationsApi";

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  const { mutate: deleteNotification, isPending: isDeleting } = useMutation({
    mutationFn: (notificationId) => deleteNotificationApi(notificationId),
    // onMutate is called before the mutation function is fired
    onMutate: async (notificationIdToDelete) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      // Snapshot the previous value
      const previousNotifications = queryClient.getQueryData(["notifications"]);

      // Optimistically update to remove the notification
      queryClient.setQueryData(["notifications"], (oldNotifications) =>
        oldNotifications
          ? oldNotifications.filter(
              (notification) => notification._id !== notificationIdToDelete
            )
          : []
      );

      // Return a context object with the snapshotted value
      return { previousNotifications };
    },
    onError: (error, notificationIdToDelete, context) => {
      // If the mutation fails, use the context we returned from onMutate to roll back
      toast.error(error.message || "Failed to delete notification");
      console.error("Delete notification error:", error);
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications"], context.previousNotifications);
      }
    },
    onSettled: () => {
      // Invalidate and refetch after either success or failure to ensure data is fresh
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return { deleteNotification, isDeleting };
};
