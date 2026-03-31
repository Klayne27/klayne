import { useQuery } from "@tanstack/react-query"
import { searchConversationsAndUsersApi } from "../../../../api/privateChatApi"
import { conversationKeys } from "./conversationKeys"

export const useSearchConversations = (searchQuery) => {
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: conversationKeys.search(searchQuery),
    queryFn: () => searchConversationsAndUsersApi(searchQuery),
    enabled: !!searchQuery,
    staleTime: 5 * 60 * 1000,
  })

  return {
    users: data?.users ?? [],
    groupChats: data?.groupChats ?? [],
    isLoading,
    isError,
    error,
    isFetching,
  }
}
