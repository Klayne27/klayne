import { useQuery } from "@tanstack/react-query";
import { conversationKeys } from "./conversationKeys";
import { getConversationsApi } from "../../../../api/privateChatApi";

export const useGetConversations = () => {
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    error: errorConversations,
    refetch: refetchConversations
  } = useQuery({
    queryKey: conversationKeys.list(),
    queryFn: getConversationsApi,
  });

  return {
    conversations,
    isLoadingConversations,
    errorConversations,
    refetchConversations,
  };
};
