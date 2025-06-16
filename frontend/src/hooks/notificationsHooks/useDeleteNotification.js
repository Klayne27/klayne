import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteNotificationApi } from "../../api/notificationsApi";

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  const { mutate: deleteNotification, isPending: isDeleting } = useMutation({
    mutationFn: (notificationId) => deleteNotificationApi(notificationId),
    onSuccess: () => {
      toast.success("Notification deleted successfully");

      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete notification");
      console.error("Delete notification error:", error);
    },
  });

  return { deleteNotification, isDeleting };
};
