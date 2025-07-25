// src/hooks/messagesHooks/useToggleConversationVisibility.js

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleConversationVisibilityApi } from "../../api/messagesApi";
import { showAppToast } from "../../utils/showAppToast";

export const useToggleConversationVisibility = () => {
  const queryClient = useQueryClient();

  const { mutate: toggleVisibility, isPending: isTogglingVisibility } = useMutation({
    mutationFn: ({ conversationId }) => toggleConversationVisibilityApi(conversationId),

    onMutate: async ({ conversationId }) => {
      // We only need to do optimistic updates for hiding. Un-hiding can wait for the refetch.
      await queryClient.cancelQueries({ queryKey: ["conversations"] });

      const previousConversations = queryClient.getQueryData(["conversations"]);

      // If there's no previous data, we can't do anything.
      if (!previousConversations) {
        return;
      }

      // **THE FIX IS HERE**
      // Optimistically remove the conversation from the list
      queryClient.setQueryData(["conversations"], (oldData) => {
        // If oldData is not an array, do nothing
        if (!Array.isArray(oldData)) {
          return oldData;
        }
        // **Directly filter the oldData array**
        return oldData.filter((conv) => conv._id !== conversationId);
      });

      // Return context with the previous data for rollback on error
      return { previousConversations };
    },

    onError: (err, variables, context) => {
      // If the mutation fails, roll back to the previous state
      if (context?.previousConversations) {
        queryClient.setQueryData(["conversations"], context.previousConversations);
      }
      showAppToast(err.message || "Failed to hide conversation.", "error");
    },

    onSettled: () => {
      // Always refetch after the mutation is settled (either success or error)
      // to ensure the client state is in sync with the server.
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  return { toggleVisibility, isTogglingVisibility };
};
