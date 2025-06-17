import { useQuery } from "@tanstack/react-query";
import { fetchConversationsApi } from "../../api/messagesApi";

export const useFetchConversations = () => {
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    error: errorConversations,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: fetchConversationsApi,
  });

  return { conversations, isLoadingConversations, errorConversations };
};
