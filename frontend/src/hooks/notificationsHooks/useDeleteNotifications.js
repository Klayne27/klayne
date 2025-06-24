import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteNotificationsApi } from "../../api/notificationsApi";

export const useDeleteNotifications = () => {
  const queryClient = useQueryClient();

  const { mutate: deleteNotifications } = useMutation({
    mutationFn: deleteNotificationsApi,
    onSuccess: () => {
      toast.success("Notifications deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return { deleteNotifications};
};
