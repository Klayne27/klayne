import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchMessagesApi } from "../../api/messagesApi";

export const useFetchMessages = (selectedConversation) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading, // Initial loading state (no data in cache, or first fetch)
    error,
    refetch: refetchMessages,
    isFetching, // Indicates any fetching, including background refetches
  } = useInfiniteQuery({
    queryKey: ["messages", selectedConversation?._id],
    queryFn: ({ pageParam = 1 }) =>
      fetchMessagesApi(selectedConversation?._id, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      const limit = 20;
      if (lastPage.length < limit) {
        return undefined;
      }
      return allPages.length + 1;
    },
    enabled: !!selectedConversation?._id && !selectedConversation._id.startsWith("new-"),
    staleTime: 5 * 60 * 1000, // e.g., 5 minutes. Data is considered "fresh" for this duration.
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes even if inactive
    // cacheTime: 10 * 60 * 1000, // You had this commented out, it's good to keep it for longer cache life
    // refetchOnMount: true, // You can keep this true if you want to always ensure a background refetch on mount after staleTime
    // refetchOnWindowFocus: true,
    // refetchOnReconnect: true,
  });

  const messages = data ? [...data.pages].reverse().flatMap((page) => page) : [];

  return {
    messages,
    isLoading, // This will be true only on the *very first* fetch, or if no data is in cache.
    error,
    refetchMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching, // This will be true during background refetches even if data is displayed
  };
};
