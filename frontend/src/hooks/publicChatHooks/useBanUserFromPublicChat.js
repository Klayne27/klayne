import { useMutation, useQueryClient } from "@tanstack/react-query";
import { banUserFromPublicChatApi } from "../../api/publicChatApi";
import { showAppToast } from "../../utils/showAppToast";

export const useBanUserFromPublicChat = () => {

  const {
    mutate: banUser,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: banUserFromPublicChatApi,
    onError: (error) => {
      showAppToast(error.message || "Failed to ban user.", "error");
    },
  });

  return { banUser, isPending, isError, error };
};
