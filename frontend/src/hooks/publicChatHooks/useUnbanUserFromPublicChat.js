import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unbanUserFromPublicChatApi } from "../../api/publicChatApi";
import { showAppToast } from "../../utils/showAppToast";
import { messageKeys } from "../messagesHooks/messageKeys";

export const useUnbanUserFromPublicChat = () => {
  const queryClient = useQueryClient();

  const {
    mutate: unbanUser,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: unbanUserFromPublicChatApi,
    onError: (error) => {
      showAppToast(error.message || "Failed to unban user.", "error");
    },
  });

  return { unbanUser, isPending, isError, error };
};
