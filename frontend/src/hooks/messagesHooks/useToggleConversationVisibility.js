import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleConversationVisibilityApi } from "../../api/messagesApi";
import toast from "react-hot-toast";

export const useToggleConversationVisibility = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: toggleVisibility, isPending: isTogglingVisibility } = useMutation({
    mutationFn: toggleConversationVisibilityApi,
    onSuccess: (data, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) => {
      console.error("Error toggling conversation visibility:", error);
      toast.error(error.message || "Failed to update conversation visibility.");
    },
  });

  return { toggleVisibility, isTogglingVisibility };
};
