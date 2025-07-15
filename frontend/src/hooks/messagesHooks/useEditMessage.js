import { useMutation, useQueryClient } from "@tanstack/react-query";
import { editMessageApi } from "../../api/messagesApi";
import toast from "react-hot-toast";

// Accept conversationId as an argument
export const useEditMessage = (conversationId) => {
  // <-- ADDED conversationId here
  const queryClient = useQueryClient();

  const { mutate: editMessage, isPending: isEditing } = useMutation({
    mutationFn: ({ messageId, newText }) => editMessageApi(messageId, newText),
    onMutate: async ({ messageId, newText }) => {
      const queryKey = ["messages", conversationId]; // <-- Use the specific query key

      // Cancel any outgoing refetches for messages for this specific conversation
      await queryClient.cancelQueries({ queryKey: queryKey }); // Use queryKey object

      // Snapshot the previous messages list for this specific conversation
      // oldData will be in the { pages: [...], pageParams: [...] } format
      const previousMessagesData = queryClient.getQueryData(queryKey);

      // Optimistically update the message in the cache
      queryClient.setQueryData(queryKey, (oldData) => {
        // <-- Use the specific query key

        if (!oldData || !oldData.pages) return oldData; // Ensure oldData and pages exist

        // Map over pages and then over messages within each page
        const updatedPages = oldData.pages.map((page) =>
          page.map((msg) =>
            msg._id === messageId ? { ...msg, text: newText, isEdited: true } : msg
          )
        );

        return { ...oldData, pages: updatedPages };
      });

      return { previousMessagesData, queryKey }; // Return snapshot and queryKey for onError/onSuccess
    },
    onSuccess: (updatedMessage, variables, context) => {
      // Invalidate queries to refetch and ensure server state is reflected
      // This is important if optimistic update was not used, or to confirm it
      // Use context.queryKey to be safe, or direct conversationId if available
      queryClient.invalidateQueries({ queryKey: context.queryKey });
      // toast.success("Message updated successfully");
    },
    onError: (error, variables, context) => {
      toast.error("Failed to update message: " + error.message);
      // Rollback to the previous state if optimistic update was used
      if (context?.previousMessagesData) {
        queryClient.setQueryData(context.queryKey, context.previousMessagesData);
      }
    },
  });

  return { editMessage, isEditing };
};
