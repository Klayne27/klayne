import { useInfiniteQuery } from "@tanstack/react-query"
import { getMessagesApi } from "../../../../api/messagesApi"
import { useMemo } from "react"
import { messageKeys } from "./messageKeys"

export const useGetMessages = (conversationId) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMessages,
    error,
    refetch: refetchMessages,
    isFetching,
  } = useInfiniteQuery({
    queryKey: messageKeys.privateMessages(conversationId),
    queryFn: ({ pageParam = 1 }) => getMessagesApi(conversationId, pageParam),

    getNextPageParam: (lastPage, allPages) => {
      const limit = 40
      if (lastPage.length < limit) {
        return undefined
      }
      return allPages.length + 1
    },
    enabled: !!conversationId,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    structuralSharing: false, // <--- ADD THIS TEMPORARILY
  })

  const messages = useMemo(() => {
    if (!data || !data.pages) return []

    const allMessages = [...data.pages].reverse().flatMap((page) => page)

    const uniqueMessages = []
    const seenIds = new Set()

    for (let i = 0; i < allMessages.length; i++) {
      const msg = allMessages[i]
      if (!seenIds.has(msg._id)) {
        uniqueMessages.push(msg)
        seenIds.add(msg._id)
      }
    }
    return uniqueMessages
  }, [data])

  return {
    messages,
    isLoadingMessages,
    error,
    refetchMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  }
}
