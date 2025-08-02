import { useInfiniteQuery } from "@tanstack/react-query"
import { fetchMessagesApi } from "../../api/messagesApi"
import { useMemo } from "react"

export const useFetchMessages = (conversationId) => {
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
    queryKey: ["messages", conversationId],
    queryFn: ({ pageParam = 1 }) => fetchMessagesApi(conversationId, pageParam),

    getNextPageParam: (lastPage, allPages) => {
      const limit = 40
      if (lastPage.length < limit) {
        return undefined
      }
      return allPages.length + 1
    },
    enabled: !!conversationId,
    // staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: true,
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
