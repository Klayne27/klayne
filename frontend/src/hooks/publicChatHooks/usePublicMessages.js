import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getPublicMessagesApi } from "../../api/publicChatApi";
import { usePublicChatSocketEvents } from "../usePublicChatSocketEvents";

export const usePublicMessages = () => {
  const MESSAGE_LIMIT = 40;

  const { typingUsers } = usePublicChatSocketEvents();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["publicMessages"],
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

  // Determine if 'someone' (excluding current user) is typing
  const isSomeoneTyping = useMemo(() => {
    return typingUsers.length > 0;
  }, [typingUsers]);

  return {
    messages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
    typingUsers,
    isSomeoneTyping, // Export the typing indicator status
  };
};
