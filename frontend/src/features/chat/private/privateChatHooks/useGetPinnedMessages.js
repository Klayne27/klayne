import { useQuery } from "@tanstack/react-query"
import { messageKeys } from "./messageKeys"
import { getPinnedMessagesApi } from "../../../../api/messagesApi"

export const useGetPinnedMessages = (conversationId) => {
  const {
    data: pinnedMessages,
    isLoading: loadingPinnedMessages,
    isError,
    error,
  } = useQuery({
    queryKey: messageKeys.pinned(conversationId),
    queryFn: () => getPinnedMessagesApi(conversationId),
    enabled: !!conversationId, // Only run if conversationId exists
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3, // Retry up to 3 times on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    select: (data) => {
      // Ensure data is always an array and filter out invalid entries
      if (!data) return []
      if (!Array.isArray(data)) {
        console.warn("Expected array but got:", typeof data, data)
        return []
      }

      // Filter and validate the structure
      return data
        .filter((pin) => {
          if (!pin) {
            console.warn("Null/undefined pin found")
            return false
          }

          if (!pin.message || !pin.pinnedBy) {
            console.warn("Invalid pin structure - missing message or pinnedBy:", pin)
            return false
          }

          if (!pin.pinnedBy.username) {
            console.warn("Invalid pin structure - missing pinnedBy.username:", pin)
            return false
          }

          return true
        })
        .sort((a, b) => {
          // Sort by pinnedAt date, most recent first
          const dateA = new Date(a.pinnedAt)
          const dateB = new Date(b.pinnedAt)
          return dateB - dateA
        })
    },
    onError: (error) => {
      console.error("Failed to fetch pinned messages:", error)
    },
  })

  return {
    pinnedMessages: pinnedMessages || [],
    loadingPinnedMessages,
    isError,
    error,
  }
}
