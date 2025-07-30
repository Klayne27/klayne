import { useMutation, useQueryClient } from "@tanstack/react-query";
import { banUserFromPublicChatApi } from "../../api/publicChatApi";
import { showAppToast } from "../../utils/showAppToast";

export const useBanUserFromPublicChat = () => {
  const queryClient = useQueryClient();

  const {
    mutate: banUser,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: banUserFromPublicChatApi,
    onSuccess: (data) => {
      // Invalidate relevant queries or show success
      queryClient.invalidateQueries({ queryKey: ["publicMessages"] }); // Optionally refetch all to clear banned user messages
      // showAppToast("User banned from public chat.");
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to ban user.", "error");
    },
  });

  return { banUser, isPending, isError, error };
};
