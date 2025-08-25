import { useMutation } from "@tanstack/react-query";
import { adminDeletePublicMessageApi } from "../../../../api/publicChatApi";
import { showAppToast } from "../../../../utils/showAppToast";

export const useDeletePublicMessage = () => {
  const {
    mutate: adminDeletePublicMessage,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: adminDeletePublicMessageApi,
    onError: (error) => {
      showAppToast(error.message || "Failed to delete message", "error");
    },
  });

  return { adminDeletePublicMessage, isPending, isError, error };
};