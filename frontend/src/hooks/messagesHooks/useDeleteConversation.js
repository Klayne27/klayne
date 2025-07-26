import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteConversationApi } from "../../api/messagesApi";
import { showAppToast } from "../../utils/showAppToast";

const useDeleteConversation = () => {
  const queryClient = useQueryClient();

  const { mutate: deleteConversation, isPending } = useMutation({
    mutationFn: (conversationId) => deleteConversationApi(conversationId),
    // This is where the magic of optimistic updates happens!
    onMutate: async (conversationIdToDelete) => {
      // 1. Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["conversations"] });

      // 2. Snapshot the current conversations list
      const previousConversations = queryClient.getQueryData(["conversations"]);

      // 3. Optimistically update the UI by removing the conversation
      queryClient.setQueryData(["conversations"], (oldConversations) =>
        oldConversations?.filter(
          (conversation) => conversation._id !== conversationIdToDelete
        )
      );

      // Return a context object with the snapshot, so we can roll back if needed
      return { previousConversations };
    },
    onSuccess: () => {
      // Hooray! The server confirmed our optimistic update.
      showAppToast("Conversation deleted forever!", "success");
      // No need to invalidate "conversations" here, as we already updated it optimistically.
      // We still invalidate "authUser" in case its related data needs a refresh.
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
    onError: (error, conversationIdToDelete, context) => {
      showAppToast(`Failed to delete conversation: ${error.message}`, "error");
      if (context?.previousConversations) {
        queryClient.setQueryData(["conversations"], context.previousConversations);
      }
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onSettled: () => {
      // Regardless of success or failure, ensure our data is eventually consistent.
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  return { deleteConversation, isPending };
};

export default useDeleteConversation;
