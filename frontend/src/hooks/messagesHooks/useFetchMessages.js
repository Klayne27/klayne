import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchMessagesApi } from "../../api/messagesApi";
import { useMemo } from "react";

export const useFetchMessages = (selectedConversation) => {
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
    queryKey: ["messages", selectedConversation?._id],
    queryFn: ({ pageParam = 1 }) =>
      fetchMessagesApi(selectedConversation?._id, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      const limit = 40;
      if (lastPage.length < limit) {
        return undefined;
      }
      return allPages.length + 1;
    },
    enabled: !!selectedConversation?._id && !selectedConversation._id.startsWith("new-"),
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
