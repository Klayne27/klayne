// src/hooks/messagesHooks/useToggleConversationVisibility.js (Updated)

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { toggleConversationVisibilityApi } from "../../api/messagesApi";
import { showAppToast } from "../../utils/showAppToast";

export const useToggleConversationVisibility = () => {
  const queryClient = useQueryClient();

  const { mutate: toggleVisibility, isPending: isTogglingVisibility } = useMutation({
    // 1. Destructure the conversationId from the input object for the API call
    mutationFn: ({ conversationId }) => toggleConversationVisibilityApi(conversationId),

    // 2. Update onMutate to be smarter
    onMutate: async ({ conversationId, isHiding = true }) => {
      // We only perform the optimistic REMOVAL if we are explicitly HIDING.
      // For unhiding, we'll do nothing here and let onSettled refetch the data.
      if (!isHiding) {
        return; // Exit early
      }

      await queryClient.cancelQueries({ queryKey: ["conversations"] });

      const previousConversationsData = queryClient.getQueryData(["conversations"]);

      // 3. Add a guard clause: If the cache is empty, we can't do an optimistic update.
      if (!previousConversationsData) {
        return;
      }

      queryClient.setQueryData(["conversations"], (oldData) => {
        // More robust check to prevent crash if data structure is unexpected
        if (!oldData?.conversations) {
          return oldData;
        }

        const updatedConversations = oldData.conversations.filter(
          (conv) => conv._id !== conversationId
        );

        return { ...oldData, conversations: updatedConversations };
      });

      return { previousConversationsData };
    },

    onError: (err, variables, context) => {
      // This rollback logic is still correct
      if (context?.previousConversationsData) {
        queryClient.setQueryData(["conversations"], context.previousConversationsData);
      }
      showAppToast(err.message || "Failed to update conversation.", "error");
    },

    // This runs for both success and error, ensuring data consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  return { toggleVisibility, isTogglingVisibility };
};
