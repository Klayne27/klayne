import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteMessageApi } from "../../api/messagesApi";
import toast from "react-hot-toast";

export const useDeleteMessage = (convId) => {
  const queryClient = useQueryClient();
  const { mutate: deleteMessage, isPending: isDeletingMessage } = useMutation({
    mutationFn: deleteMessageApi,
    onSuccess: () => {
      queryClient.invalidateQueries(["messages", convId]);
      queryClient.invalidateQueries(["conversations"]);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete message.");
    },
  });

  return { deleteMessage, isDeletingMessage };
};
