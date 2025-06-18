import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteMessageApi } from "../../api/messagesApi";
import toast from "react-hot-toast";

export const useDeleteMessage = (actualConversationId) => {
  const queryClient = useQueryClient();
  const { mutate: deleteMessage, isPending: isDeletingMessage } = useMutation({
    mutationFn: deleteMessageApi,
    onSuccess: (data, variables, context) => {
    //   toast.success("Message deleted!");
    if (context.newMessagesCount === 0) {
      queryClient.setQueryData(["messages", actualConversationId], []);
    } else {
      queryClient.invalidateQueries(["messages", actualConversationId]);
    }

    queryClient.invalidateQueries(["conversations"]);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete message.");
    },
  });

  return { deleteMessage, isDeletingMessage };
};
