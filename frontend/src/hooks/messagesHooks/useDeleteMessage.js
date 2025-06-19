import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteMessageApi } from "../../api/messagesApi";
import toast from "react-hot-toast";

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();
  const { mutate: deleteMessage, isPending: isDeletingMessage } = useMutation({
    mutationFn: deleteMessageApi,
    onSuccess: () => {
      queryClient.invalidateQueries(["messages"]);
      queryClient.invalidateQueries(["conversations"]);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete message.");
    },
  });

  return { deleteMessage, isDeletingMessage };
};
