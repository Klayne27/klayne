import { useMutation, useQueryClient } from "@tanstack/react-query";
import { messageKeys } from "./messageKeys";
import { deleteMessageApi } from "../../../../api/privateChatApi";
import { showAppToast } from "../../../../utils/showAppToast";

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();

  const { mutate: deleteMessage } = useMutation({
    mutationFn: deleteMessageApi,
    onMutate: async ({ messageId, conversationId }) => {
      const queryKey = messageKeys.privateMessages(conversationId);

      await queryClient.cancelQueries({ queryKey: queryKey });

      const previousMessagesData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData || !oldData.pages) {
          return oldData;
        }

        const updatedPages = oldData.pages.map((page) =>
          page.filter((msg) => msg._id !== messageId),
        );

        return { ...oldData, pages: updatedPages };
      });

      return { previousMessagesData, messageId, conversationId };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(
        messageKeys.privateMessages(context.conversationId),
        context.previousMessagesData,
      );
      showAppToast(error.message || "Failed to delete message.", "error");
    },
  });

  return { deleteMessage };
};