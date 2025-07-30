import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unbanUserFromPublicChatApi } from "../../api/publicChatApi";
import { showAppToast } from "../../utils/showAppToast";

export const useUnbanUserFromPublicChat = () => {
  const queryClient = useQueryClient();

  const {
    mutate: unbanUser,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: unbanUserFromPublicChatApi,
    onSuccess: (data) => {
      // Invalidate relevant queries or show success
      queryClient.invalidateQueries({ queryKey: ["publicMessages"] });
      // showAppToast("User unbanned from public chat.");
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to unban user.", "error");
    },
  });

  return { unbanUser, isPending, isError, error };
};
