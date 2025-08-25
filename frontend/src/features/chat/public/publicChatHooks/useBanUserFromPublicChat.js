import { useMutation } from "@tanstack/react-query";
import { showAppToast } from "../../../../utils/showAppToast";
import { banUserFromPublicChatApi } from "../../../../api/publicChatApi";

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
