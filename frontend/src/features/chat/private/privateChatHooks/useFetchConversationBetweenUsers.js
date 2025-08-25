import { useQuery } from "@tanstack/react-query";
import { conversationKeys } from "./conversationKeys";
import { getConversationBetweenUsersApi } from "../../../../api/messagesApi";

export const useFetchConversationBetweenUsers = (otherUserId) => {
  const {
    data: conversationStatus,
    isLoading: isLoadingConversationStatus,
    isError: isErrorConversationStatus,
    error: conversationStatusError,
  } = useQuery({
    queryKey: conversationKeys.betweenUsers(otherUserId),
    queryFn: () => getConversationBetweenUsersApi(otherUserId),
    enabled: !!otherUserId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: 1,
  });

  return {
    conversationStatus,
    isLoadingConversationStatus,
    isErrorConversationStatus,
    conversationStatusError,
  };
};
