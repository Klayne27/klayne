import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteConversationApi } from "../../api/messagesApi";
import { showAppToast } from "../../utils/showAppToast";

const useDeleteConversation = () => {
  const queryClient = useQueryClient();

  const { mutate: deleteConversation, isPending } = useMutation({
    mutationFn: (conversationId) => deleteConversationApi(conversationId),
    onMutate: async (conversationIdToDelete) => {
      await queryClient.cancelQueries({ queryKey: ["conversations"] });

      const previousConversations = queryClient.getQueryData(["conversations"]);

      queryClient.setQueryData(["conversations"], (oldConversations) =>
        oldConversations?.filter(
          (conversation) => conversation._id !== conversationIdToDelete
        )
      );

      return { previousConversations };
    },
    onSuccess: () => {
      showAppToast("Conversation deleted successfully", "success");
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
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  return { deleteConversation, isPending };
};

export default useDeleteConversation;
