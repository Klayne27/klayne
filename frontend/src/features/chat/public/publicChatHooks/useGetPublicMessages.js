import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getPublicMessagesApi } from "../../../../api/publicChatApi";
import { messageKeys } from "../../private/privateChatHooks/messageKeys";

export const useGetPublicMessages = () => {
  const MESSAGE_LIMIT = 40;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMessages,
    isError: isMessagesError,
    error: messagesError,
    refetch,
  } = useInfiniteQuery({
    queryKey: messageKeys.publicMessages(),
    queryFn: getPublicMessagesApi,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < MESSAGE_LIMIT) {
        return undefined;
      }
      return allPages.length + 1;
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });

  const messages = useMemo(() => {
    return data ? [...data.pages].reverse().flatMap((page) => page) : [];
  }, [data]);

  return {
    messages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoadingMessages,
    isMessagesError,
    messagesError,
    refetch,
  };
};
