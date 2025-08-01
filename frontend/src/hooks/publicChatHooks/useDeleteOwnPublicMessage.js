import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteOwnPublicMessageApi } from "../../api/publicChatApi";
import { showAppToast } from "../../utils/showAppToast";

export const useDeleteOwnPublicMessage = () => {
  const queryClient = useQueryClient();

  const { mutate: deleteOwnMessage, isPending: isDeletingOwnMessage } = useMutation({
    mutationFn: (messageId) => deleteOwnPublicMessageApi(messageId),
    onMutate: async (messageIdToDelete) => {
      await queryClient.cancelQueries(["publicMessages"]);
      const previousMessages = queryClient.getQueryData(["publicMessages"]);

      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData) return oldData;
        const newPages = oldData.pages.map((page) =>
          page.map((message) => {
            if (message._id === messageIdToDelete) {
              // Optimistically mark as deleted and update content/img
              return {
                ...message,
                isDeletedByUser: true,
                text: "[Message Deleted]", // Set the desired display text
                img: null, // Clear image optimistically
                // You might also want to clear reactions or other sensitive data
                reactions: [],
                repliedTo: message.repliedTo
                  ? {
                      // Preserve repliedTo structure but clear text
                      ...message.repliedTo,
                      text: "", // Clear the text of the replied-to message in the optimistic state
                      img: null,
                      isOriginalMessageDeleted: true, // Mark the original as deleted
                    }
                  : null,
              };
            }
            // Also handle if this message was a reply to the one being deleted
            if (message.repliedTo && message.repliedTo._id === messageIdToDelete) {
              return {
                ...message,
                repliedTo: {
                  ...message.repliedTo,
                  text: "[Message Deleted]", // For the reply block
                  img: null,
                  isDeletedByUser: true,
                  isOriginalMessageDeleted: true,
                },
              };
            }
            return message;
          })
        );
        return { ...oldData, pages: newPages };
      });

      return { previousMessages };
    },
    onError: (err, messageIdToDelete, context) => {
      showAppToast(err.message || "Failed to delete message.", "error");
      if (context?.previousMessages) {
        queryClient.setQueryData(["publicMessages"], context.previousMessages);
      }
    },
    onSettled: (data, error, variables, context) => {
      // The socket listener 'publicOwnMessageDeleted' will be responsible
      // for the final authoritative update (which is consistent with this optimistic state).
      // No explicit invalidate here is usually needed if the socket is reliable.
    },
  });

  return { deleteOwnMessage, isDeletingOwnMessage };
};
