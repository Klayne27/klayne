// src/hooks/messagesHooks/useToggleConversationVisibility.js

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleConversationVisibilityApi } from "../../api/messagesApi";
import { showAppToast } from "../../utils/showAppToast";

export const useToggleConversationVisibility = () => {
  const queryClient = useQueryClient();

  const { mutate: toggleVisibility, isPending: isTogglingVisibility } = useMutation({
    mutationFn: ({ conversationId }) => toggleConversationVisibilityApi(conversationId),

    onMutate: async ({ conversationId }) => {
      await queryClient.cancelQueries({ queryKey: ["conversations"] });

      const previousConversations = queryClient.getQueryData(["conversations"]);

      if (!previousConversations) {
        return;
      }

      queryClient.setQueryData(["conversations"], (oldData) => {
        if (!Array.isArray(oldData)) {
          return oldData;
        }
        return oldData.filter((conv) => conv._id !== conversationId);
      });

      return { previousConversations };
    },

    onError: (err, variables, context) => {
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
