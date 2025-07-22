// src/hooks/messages/useFetchConversationBetweenUsers.js
import { useQuery } from "@tanstack/react-query";
import { getConversationBetweenUsersApi } from "../../api/messagesApi";

export const useFetchConversationBetweenUsers = (otherUserId) => {
  return useQuery({
    queryKey: ["conversationBetweenUsers", otherUserId], // Unique key for this query
    queryFn: () => getConversationBetweenUsersApi(otherUserId),
    enabled: !!otherUserId, // Only enable if otherUserId is not null/undefined
    staleTime: 5 * 60 * 1000, // Data can be considered fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1, // Retry once if it fails
    // Select what you need from the data if you want to optimize rendering
    // select: (data) => data.conversationId, // if you only need the ID
  });
};
