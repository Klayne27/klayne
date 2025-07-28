import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchMessagesApi } from "../../api/messagesApi";
import { useMemo } from "react";

export const useFetchMessages = (conversationId) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch: refetchMessages,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ["messages", conversationId],
    queryFn: ({ pageParam = 1 }) => fetchMessagesApi(conversationId, pageParam),

    getNextPageParam: (lastPage, allPages) => {
      const limit = 40;
      if (lastPage.length < limit) {
        return undefined;
      }
      return allPages.length + 1;
    },
    enabled: !!conversationId,
    // staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    structuralSharing: false, // <--- ADD THIS TEMPORARILY
  });

  // const messages = data ? [...data.pages].reverse().flatMap((page) => page) : [];

  const messages = useMemo(() => {
    if (!data || !data.pages) return [];

    // FIX: Create a shallow copy before reversing to prevent mutating the original React Query data
    const allMessages = [...data.pages].reverse().flatMap((page) => page);

    const uniqueMessages = [];
    const seenIds = new Set();

    // The messages are already oldest at top, newest at bottom after the backend reversal
    // and this client-side reversal, assuming the backend's reversal is correct.
    // So `flattenedAndOrdered` is already the desired order for the UI.

    for (let i = 0; i < allMessages.length; i++) {
      // Changed from flattenedAndOrdered to allMessages
      const msg = allMessages[i];
      if (!seenIds.has(msg._id)) {
        uniqueMessages.push(msg);
        seenIds.add(msg._id);
      }
    }
    return uniqueMessages;
  }, [data]); // Dependency is `data` - if data.pages or its contents change, `data` object reference changes.

  return {
    messages,
    isLoading,
    error,
    refetchMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  };
};
