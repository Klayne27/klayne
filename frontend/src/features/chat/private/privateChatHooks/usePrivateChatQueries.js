import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getConversationBetweenUsersApi, getConversationsApi, getFollowedUsersForMessagingApi, getMessagesApi, getOrCreateConversationApi, getPinnedMessagesApi, searchConversationsAndUsersApi } from "../../../../api/privateChatApi"
import { useMemo } from "react"
import { messageKeys } from "./messageKeys"
import { conversationKeys } from "./conversationKeys"
import { useNavigate } from "react-router-dom"
import { showAppToast } from "../../../../utils/showAppToast"

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

export const useGetConversations = () => {
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    error: errorConversations,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: conversationKeys.list(),
    queryFn: getConversationsApi,
  })

  return {
    conversations,
    isLoadingConversations,
    errorConversations,
    refetchConversations,
  }
}

export const useGetOrCreateConversation = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { mutate, isPending: isCreatingConversation } = useMutation({
    mutationFn: getOrCreateConversationApi,
    onSuccess: (conversation) => {
      if (conversation?._id) {
        navigate(`/messages/${conversation._id}`)
      } else {
        showAppToast("Failed to open chat: Conversation ID missing.")
      }
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to open conversation.", "error")
    },
  })

  const getOrCreateConversation = ({
    existingConversationId,
    targetUserId,
    participantIds,
    name,
  } = {}) => {
    // Group search result — already exists, just navigate
    if (existingConversationId) {
      navigate(`/messages/${existingConversationId}`)
      return
    }
    mutate({ targetUserId, participantIds, name })
  }

  return { getOrCreateConversation, isCreatingConversation }
}

export const useSearchConversations = (searchQuery) => {
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: conversationKeys.search(searchQuery),
    queryFn: () => searchConversationsAndUsersApi(searchQuery),
    enabled: !!searchQuery,
    staleTime: 5 * 60 * 1000,
  })

  return {
    users: data?.users ?? [],
    groupChats: data?.groupChats ?? [],
    isLoading,
    isError,
    error,
    isFetching,
  }
}

export const useGetConversationBetweenUsers = (otherUserId) => {
  const {
    data: conversationStatus,
    isLoading: isLoadingConversationStatus,
    isError: isErrorConversationStatus,
    error: conversationStatusError,
  } = useQuery({
    queryKey: conversationKeys.betweenUsers(otherUserId),
    queryFn: () => getConversationBetweenUsersApi(otherUserId),
    enabled: !!otherUserId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: 1,
  })

  return {
    conversationStatus,
    isLoadingConversationStatus,
    isErrorConversationStatus,
    conversationStatusError,
  }
}

export const useGetFollowedUsersForMessaging = (searchQuery) => {
  const {
    data: searchedFollowedUsers,
    isLoading: isLoadingFollowedUsers,
    isError: isErrorFollowedUsers,
    error: followedUsersError,
    isFetching: isFetchingFollowedUsers,
  } = useQuery({
    queryKey: conversationKeys.followedUsers(searchQuery),
    queryFn: () => getFollowedUsersForMessagingApi(searchQuery),
    enabled: !!searchQuery,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  })

  return {
    searchedFollowedUsers,
    isLoadingFollowedUsers,
    isErrorFollowedUsers,
    followedUsersError,
    isFetchingFollowedUsers,
  }
}
