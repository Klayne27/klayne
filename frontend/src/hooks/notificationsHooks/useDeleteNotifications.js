import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteNotificationsApi } from "../../api/notificationsApi";

export const useDeleteNotifications = () => {
  const queryClient = useQueryClient();

  const { mutate: deleteNotifications, isPending: isDeleting } = useMutation({
    mutationFn: deleteNotificationsApi,
    // onMutate is called before the mutation function is fired
    onMutate: async () => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      // Snapshot the previous value
      const previousNotifications = queryClient.getQueryData(["notifications"]);

      // Optimistically update to clear all notifications
      queryClient.setQueryData(["notifications"], []);

      // Return a context object with the snapshotted value
      return { previousNotifications };
    },
    onError: (error, variables, context) => {
      // If the mutation fails, use the context we returned from onMutate to roll back
      toast.error(error.message || "Failed to delete all notifications");
      console.error("Delete all notifications error:", error);
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications"], context.previousNotifications);
      }
    },
    onSettled: () => {
      // Invalidate and refetch after either success or failure to ensure data is fresh
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return { deleteNotifications, isDeleting };
};
