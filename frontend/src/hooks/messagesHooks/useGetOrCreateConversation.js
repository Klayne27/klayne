import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getOrCreateConversationApi } from "../../api/messagesApi";

export const useGetOrCreateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: getOrCreateConversationApi,
    onSuccess: (data) => {
      // Invalidate existing conversations query to refetch the updated list
      // This ensures the new/unhidden conversation appears in the ConversationsList
      queryClient.invalidateQueries(["conversations"]);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to open conversation.");
    },
  });
};
