import { useMutation, useQueryClient } from "@tanstack/react-query";
import { editMessageApi } from "../../api/messagesApi";
import toast from "react-hot-toast";

export const useEditMessage = () => {
  const queryClient = useQueryClient();

  const { mutate: editMessage, isPending: isEditing } = useMutation({
    mutationFn: ({ messageId, newText }) => editMessageApi(messageId, newText),
    onMutate: async ({ messageId, newText }) => {
      // Optional: Optimistic update (faster UI response)
      // Cancel any outgoing refetches for messages
      await queryClient.cancelQueries(["messages"]);

      // Snapshot the previous messages list
      const previousMessages = queryClient.getQueryData(["messages"]);

      // Optimistically update the message in the cache
      queryClient.setQueryData(["messages"], (oldMessages) => {
        if (!oldMessages) return oldMessages;
        return oldMessages.map((msg) =>
          msg._id === messageId ? { ...msg, text: newText, isEdited: true } : msg
        );
      });

      return { previousMessages }; // Return snapshot for onError
    },
    onSuccess: (updatedMessage) => {
      // Invalidate queries to refetch and ensure server state is reflected
      // This is important if optimistic update was not used, or to confirm it
      queryClient.invalidateQueries(["messages", updatedMessage.conversationId]);
      //   toast.success("Message updated successfully");
    },
    onError: (error, variables, context) => {
      toast.error("Failed to update message: " + error.message);
      // Rollback to the previous state if optimistic update was used
      if (context?.previousMessages) {
        queryClient.setQueryData(["messages"], context.previousMessages);
      }
    },
  });

  return { editMessage, isEditing };
};
