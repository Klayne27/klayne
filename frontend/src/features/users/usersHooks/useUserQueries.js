import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import {
  getFollowRequestsApi,
  getMuteStatusApi,
  getSuggestedUsersApi,
  getSuggestedUsersPageApi,
  getUserProfileApi,
  getUsersApi,
  getUserStatsApi,
} from "../../../api/usersApi"
import { userKeys } from "./userKeys"

export const useGetUserProfile = (username) => {
  const { data, isLoading, isRefetching, error, isError, refetch } = useQuery({
    queryKey: userKeys.profile(username),
    queryFn: async () => {
      const result = await getUserProfileApi(username)
      return result
    },
    retry: (failureCount, error) => {
      if (error?.status === 403 || error?.status === 404) {
        return false
      }
      return failureCount < 3
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  })

  const userProfile = data?.user || null
  const isBlockedByYou = data?.isBlockedByYou || false
  const hasBlockedYou = data?.hasBlockedYou || false
  const message = data?.message || error?.message || null
  const httpStatus = data?.status || error?.status || null

  return {
    userProfile,
    isLoading,
    isRefetching,
    error: message,
    isError,
    refetch,
    isBlockedByYou,
    hasBlockedYou,
    httpStatus,
  }
}

export const useGetSuggestedUsers = () => {
  const {
    data: suggestedUsers,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: userKeys.suggestedList(),
    queryFn: getSuggestedUsersApi,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  return { suggestedUsers, isLoading, refetch, isRefetching }
}

export const useGetFollowList = (userId, type) => {
  const endpoint = userId
    ? type === "following"
      ? `/api/users/following/${userId}`
      : `/api/users/followers/${userId}`
    : null

  const enabled = !!userId && !!endpoint

  const {
    data: users = [],
    isLoading,
    error,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: userKeys.followList(type, userId),
    queryFn: async () => getUsersApi(endpoint, type),
    enabled: enabled,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: (failureCount, err) => {
      if (err?.status === 403 || err?.status === 404) {
        return false
      }
      return failureCount < 3
    },
  })

  return { users, isLoading, error, isError, refetch, isRefetching }
}

export const useGetUserStats = (username) => {
  const { data, isLoading } = useQuery({
    queryKey: userKeys.stats(username),
    queryFn: () => getUserStatsApi(username),
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
  })

  return {
    totalLikes: data?.totalLikes ?? 0,
    totalReposts: data?.totalReposts ?? 0,
    isLoadingStats: isLoading,
  }
}

export const useGetMuteStatus = (userId) => {
  const { data, isLoading } = useQuery({
    queryKey: ["muteStatus", userId],
    queryFn: () => getMuteStatusApi(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  })

  return {
    isMuted: data?.isMuted ?? false,
    muteType: data?.muteType ?? null,
    isLoading,
  }
}

export const useGetSuggestedUsersInfinite = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ["suggestedUsersPage"],
    queryFn: getSuggestedUsersPageApi,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    staleTime: 2 * 60 * 1000,
    gcTime:    5 * 60 * 1000,
  })

  // Flatten pages into a single array
  const users = data?.pages.flatMap((p) => p.users) ?? []

  return { users, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error }
}

export const useGetFollowRequests = () => {
  const { data: followRequests = [], isLoading } = useQuery({
    queryKey: userKeys.followRequests(),
    queryFn: getFollowRequestsApi,
    staleTime: 60_000,
  })
  return { followRequests, isLoading }
}
