import { useQuery } from "@tanstack/react-query";
import { fetchFollowedUsersForMessagingApi } from "../../api/messagesApi";

export const useGetFollowedUsersForMessaging = (searchQuery) => {
  return useQuery({
    queryKey: ["followedUsersForMessaging", searchQuery], // Query key now includes searchQuery
    queryFn: () => fetchFollowedUsersForMessagingApi(searchQuery),
    enabled: !!searchQuery, // Only fetch when searchQuery is not empty
    staleTime: 5 * 60 * 1000, // Data considered fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Data stays in cache for 10 minutes
    // refetchOnWindowFocus: true, // You might want to disable this if you only want explicit searches
    // refetchOnMount: true, // Same here
  });
};