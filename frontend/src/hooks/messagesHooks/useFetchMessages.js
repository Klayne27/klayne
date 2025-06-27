import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchMessagesApi } from "../../api/messagesApi";

export const useFetchMessages = (selectedConversation) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
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
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  const messages = data ? [...data.pages].reverse().flatMap((page) => page) : [];

  return {
    messages,
    isLoading,
    error,
    refetchMessages: refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
};
