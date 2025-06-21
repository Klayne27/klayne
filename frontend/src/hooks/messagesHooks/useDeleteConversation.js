import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteConversationApi } from "../../api/messagesApi";

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();

  const {
    mutate: deleteConversation,
    isPending: isDeleting,
    isError,
    error,
  } = useMutation({
    mutationFn: deleteConversationApi,
    onSuccess: (data, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.removeQueries({ queryKey: ["messages", conversationId] });
      toast.success(data.message || "Conversation deleted successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete conversation.");
      console.error("Error deleting conversation:", error);
    },
  });

  return { deleteConversation, isDeleting, isError, error };
};
