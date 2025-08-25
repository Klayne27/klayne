import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  endStudySession,
  getPomodoroSettings,
  getStudyActivityFeed,
  startStudySession,
  updatePomodoroSettings,
} from "../../api/pomodoroApi"
import { showAppToast } from "../../utils/showAppToast"
import {
  getMonthlyLeaderboard,
  getPreviousWinnersApi,
  getTotalLeaderboard,
} from "../../api/leaderboardApi"
import { AUTH_USER_QUERY_KEY } from "../../constants/queryKeys"

export const useGetPomodoroSettings = () => {
  const { data: settings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ["pomodoroSettings"],
    queryFn: getPomodoroSettings,
  })

  return { settings, isSettingsLoading }
}

export const useUpdatePomodoroSettings = () => {
  const queryClient = useQueryClient()

  const { mutate: updateSettings, isPending: isUpdatingSettings } = useMutation({
    mutationFn: updatePomodoroSettings,
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: ["pomodoroSettings"] })

      const previousSettings = queryClient.getQueryData(["pomodoroSettings"])

      queryClient.setQueryData(["pomodoroSettings"], (oldSettings) => ({
        ...oldSettings,
        ...newSettings,
      }))

      return { previousSettings }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pomodoroSettings"] })
    },
    onError: (err, newSettings, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(["pomodoroSettings"], context.previousSettings)
      } 
      console.error("Failed to update settings. Rolling back.", err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["pomodoroSettings"] })
    },
  })

  return { updateSettings, isUpdatingSettings }
}

export const useStartStudySession = () => {
  return useMutation({
    mutationFn: startStudySession,
    onSuccess: () => {
      showAppToast("Study session started!", "success")
    },
    onError: (error) => {
      showAppToast(error.message, "error")
    },
  })
}

export const useEndStudySession = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: endStudySession, // Let's make this optimistic!
    onMutate: async ({ duration }) => {
      // First, we'll cancel any ongoing queries to prevent them from overwriting our optimistic update.
      await queryClient.cancelQueries({ queryKey: AUTH_USER_QUERY_KEY })
      await queryClient.cancelQueries({ queryKey: ["leaderboard"] }) // Get the current user data from the cache. We'll save this to roll back if the mutation fails.

      const previousAuthUser = queryClient.getQueryData(AUTH_USER_QUERY_KEY) // Now, we'll optimistically update the user data in our local cache.
      // This makes the UI feel instant to the user.

      queryClient.setQueryData(AUTH_USER_QUERY_KEY, (oldUser) => {
        if (!oldUser) return oldUser

        const newTotalStudyDuration = oldUser.totalStudyDuration + duration
        const newTotalSessionsCompleted = oldUser.totalSessionsCompleted + 1
        const newMonthlyStats = { ...oldUser.monthlyStats } // We can also optimistically calculate and update XP, streaks, and other stats!

        newMonthlyStats.studyDuration += duration
        newMonthlyStats.sessionsCompleted += 1 // For XP, you'd need to replicate the client-side calculation from your handleSessionEnd logic.
        // const calculatedXpGained = settings.sessionDuration * xpMultiplier;
        // newMonthlyStats.xpEarned += calculatedXpGained;
        return {
          ...oldUser,
          totalStudyDuration: newTotalStudyDuration,
          totalSessionsCompleted: newTotalSessionsCompleted,
          monthlyStats: newMonthlyStats, // ... other stats like studyStreak, levels, etc.
        }
      }) // We return the previous data so the `onError` function can use it to roll back.

      return { previousAuthUser }
    }, // If the server request is successful, we'll refetch the data to be sure it's in sync.

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] })
    }, // If the request fails, we'll use the `context` to roll back to the old data.

    onError: (error, variables, context) => {
      if (context?.previousAuthUser) {
        queryClient.setQueryData(AUTH_USER_QUERY_KEY, context.previousAuthUser)
      }
      showAppToast(error.message, "error")
    },
  })
}

export const useGetStudyActivityFeed = (page) => {
  const { data, isLoading } = useQuery({
    queryKey: ["studyActivity", page], // Add page to the queryKey
    queryFn: () => getStudyActivityFeed(page),
  })

  return {
    activityFeed: data?.activityFeed,
    totalPages: data?.totalPages,
    isLoading,
  }
}

// Hook for total (all-time) leaderboard
export const useGetTotalLeaderboard = (page) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["leaderboard", "total", page],
    queryFn: () => getTotalLeaderboard(page),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    leaderboard: data?.leaderboard,
    totalPages: data?.totalPages,
    currentPage: data?.currentPage,
    type: data?.type,
    isLoading,
    error,
  }
}

// Hook for monthly leaderboard
export const useGetMonthlyLeaderboard = (page) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["leaderboard", "monthly", page],
    queryFn: () => getMonthlyLeaderboard(page),
    staleTime: 1 * 60 * 1000, // 1 minute (shorter for monthly as it changes more frequently)
  })

  return {
    leaderboard: data?.leaderboard,
    totalPages: data?.totalPages,
    currentPage: data?.currentPage,
    type: data?.type,
    currentMonth: data?.currentMonth,
    isLoading,
    error,
  }
}

export const useGetPreviousWinners = () => {
  const { data: previousWinners, isLoading: isLoadingPreviousWinners } = useQuery({
    queryKey: ["previousWinners"],
    queryFn: getPreviousWinnersApi,
  })

  return { previousWinners, isLoadingPreviousWinners }
}

export const useGetLeaderboard = (page) => {
  return useGetTotalLeaderboard(page)
}
