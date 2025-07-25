import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getOrCreateConversationApi } from "../../api/messagesApi";
import { showAppToast } from "../../utils/showAppToast";

export const useGetOrCreateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: getOrCreateConversationApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries(["conversations"]);
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to open conversation.", "error");
    },
  });
};
