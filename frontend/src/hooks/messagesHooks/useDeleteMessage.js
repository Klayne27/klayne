import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteMessageApi } from "../../api/messagesApi";
import { showAppToast } from "../../utils/showAppToast";

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();

  const { mutate: deleteMessage, isPending: isDeletingMessage } = useMutation({
    mutationFn: deleteMessageApi,
    onMutate: async ({ messageId, conversationId }) => {
      const queryKey = ["messages", conversationId];
      await queryClient.cancelQueries({ queryKey: queryKey });

      const previousMessagesData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData || !oldData.pages) {
          return oldData;
        }

        const updatedPages = oldData.pages.map((page) =>
          page.filter((msg) => msg._id !== messageId)
        );

        const filteredPages = updatedPages.filter((page) => page.length > 0);

        return { ...oldData, pages: filteredPages };
      });


      return { previousMessagesData, queryKey, messageId, conversationId };
    },
    onSuccess: (data, variables, context) => {
      // queryClient.invalidateQueries({ queryKey: context.queryKey });
    },
    onError: (error, variables, context) => {
      showAppToast(error.message || "Failed to delete message.", "error");

      if (context?.previousMessagesData) {
        queryClient.setQueryData(context.queryKey, context.previousMessagesData);
      }
    },
  });

  return { deleteMessage, isDeletingMessage };
};
