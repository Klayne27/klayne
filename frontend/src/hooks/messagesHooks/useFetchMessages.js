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

    const allMessages = data.pages.reverse().flatMap((page) => page);
    const uniqueMessages = [];
    const seenIds = new Set();

    const flattenedAndOrdered = allMessages; // This produces oldest at top, newest at bottom

    for (let i = 0; i < flattenedAndOrdered.length; i++) {
      const msg = flattenedAndOrdered[i];
      // If you have optimistic IDs, you might need a more complex deduplication
      // that considers both real _id and optimisticId.
      // For now, assuming optimisticId is temporary and _id is the stable one.
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
