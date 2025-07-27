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
    queryFn: () =>
      fetchMessagesApi(conversationId),
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
    return data ? [...data.pages].reverse().flatMap((page) => page) : [];
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
