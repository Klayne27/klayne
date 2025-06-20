// src/hooks/messagesHooks/useDeleteConversation.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteConversationApi } from "../../api/messagesApi";

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();

  const {
    mutate: deleteConversation, // Renamed 'mutate' to 'deleteConversation' for clarity
    isPending: isDeleting, // Renamed 'isPending' to 'isDeleting'
    isError,
    error,
  } = useMutation({
    mutationFn: deleteConversationApi,
    onSuccess: (data, conversationId) => {
      // Invalidate the 'conversations' query to refetch the updated list.
      // This ensures the conversation disappears from the list immediately.
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      // You might also want to remove individual messages from cache for this conversation if they exist
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
