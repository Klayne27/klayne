import { useQuery } from "@tanstack/react-query";
import { fetchFollowedUsersForMessagingApi } from "../../api/messagesApi";

export const useGetFollowedUsersForMessaging = (searchQuery) => {
  return useQuery({
    queryKey: ["followedUsersForMessaging", searchQuery],
    queryFn: () => fetchFollowedUsersForMessagingApi(searchQuery),
    enabled: !!searchQuery,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};