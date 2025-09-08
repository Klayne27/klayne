import { useQuery } from "@tanstack/react-query"
import { getFollowedUsersForMessagingApi } from "../../../../api/privateChatApi"
import { conversationKeys } from "./conversationKeys"

export const useGetFollowedUsersForMessaging = (searchQuery) => {
  const {
    data: searchedFollowedUsers,
    isLoading: isLoadingFollowedUsers,
    isError: isErrorFollowedUsers,
    error: followedUsersError,
    isFetching: isFetchingFollowedUsers,
  } = useQuery({
    queryKey: conversationKeys.followedUsers(searchQuery),
    queryFn: () => getFollowedUsersForMessagingApi(searchQuery),
    enabled: !!searchQuery,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  })

  return {
    searchedFollowedUsers,
    isLoadingFollowedUsers,
    isErrorFollowedUsers,
    followedUsersError,
    isFetchingFollowedUsers,
  }
}
