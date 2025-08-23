import { useQuery } from "@tanstack/react-query";
import { fetchConversationsApi } from "../../api/messagesApi";
import { CONVERSATIONS_QUERY_KEY } from "../../constants/queryKeys";

export const useFetchConversations = () => {
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    error: errorConversations,
    refetch: refetchConversations
  } = useQuery({
    queryKey: CONVERSATIONS_QUERY_KEY,
    queryFn: fetchConversationsApi,
    // staleTime: Infinity
  });

  return {
    conversations,
    isLoadingConversations,
    errorConversations,
    refetchConversations,
  };
};
