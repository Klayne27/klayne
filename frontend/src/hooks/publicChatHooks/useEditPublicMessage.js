import { useMutation, useQueryClient } from "@tanstack/react-query";
import { editPublicMessageApi } from "../../api/publicChatApi";
import { showAppToast } from "../../utils/showAppToast";

export const useEditPublicMessage = () => {
  const queryClient = useQueryClient();

  // The 'mutate' function is returned from useMutation, let's capture it.
  const { mutate: editPublicMessage, isPending: isEditing } = useMutation({
    mutationFn: ({ messageId, newContent }) =>
      editPublicMessageApi(messageId, newContent),

    onMutate: async ({ messageId, newContent }) => {
      // Your onMutate logic is correct for the optimistic update.
      await queryClient.cancelQueries({ queryKey: ["publicMessages"] });
      const previousMessages = queryClient.getQueryData(["publicMessages"]);

      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData || !oldData.pages) return oldData;

        const updatedPages = oldData.pages.map((page) =>
          page.map((message) => {
            if (message._id === messageId) {
              return {
                ...message,
                content: newContent,
                isEdited: true,
                // editedAt: new Date().toISOString(),
              };
            }
            return message;
          })
        );
        return { ...oldData, pages: updatedPages };
      });

      return { previousMessages };
    },

    // ✅ ADDED: A proper onSuccess handler
    onSuccess: (updatedMessage) => {
      // Use the authoritative data from the server to update the cache.
      // This is faster and more reliable than waiting for the socket echo.
      // queryClient.setQueryData(["publicMessages"], (oldData) => {
      //   if (!oldData) return oldData;
      //   const updatedPages = oldData.pages.map((page) =>
      //     page.map((message) => {
      //       // Case 1: This is the message that was edited.
      //       if (message._id === updatedMessage._id) {
      //         return updatedMessage;
      //       }
      //       // Case 2: This message replies to the edited one. Update its 'replyTo' block.
      //       if (message.replyTo && message.replyTo._id === updatedMessage._id) {
      //         return {
      //           ...message,
      //           replyTo: updatedMessage,
      //         };
      //       }
      //       return message;
      //     })
      //   );
      //   return { ...oldData, pages: updatedPages };
      // });
    },

    onError: (error, variables, context) => {
      console.error("Mutation failed:", error); // Log the actual error to the console
      showAppToast(error.message || "Failed to edit message.", "error");
      if (context?.previousMessages) {
        queryClient.setQueryData(["publicMessages"], context.previousMessages);
      }
    },
  });

  // Return the mutation function and its state from your custom hook
  return { editPublicMessage, isEditing };
};
