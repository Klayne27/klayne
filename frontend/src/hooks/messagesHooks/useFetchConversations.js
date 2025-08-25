import { useQuery } from "@tanstack/react-query";
import { fetchConversationsApi } from "../../api/messagesApi";
import { conversationKeys } from "./conversationKeys";

export const useFetchConversations = () => {
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    error: errorConversations,
    refetch: refetchConversations
  } = useQuery({
    queryKey: conversationKeys.list(),
    queryFn: fetchConversationsApi,
  });

  return {
    conversations,
    isLoadingConversations,
    errorConversations,
    refetchConversations,
  };
};
