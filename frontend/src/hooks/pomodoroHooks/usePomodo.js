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
import { userKeys } from "../usersHooks/userKeys"
import { pomodoroKeys } from "./pomodoroKeys"

export const useGetPomodoroSettings = () => {
  const { data: settings, isLoading: isSettingsLoading } = useQuery({
    queryKey: pomodoroKeys.settings(),
    queryFn: getPomodoroSettings,
  })

  return { settings, isSettingsLoading }
}

export const useUpdatePomodoroSettings = () => {
  const queryClient = useQueryClient()

  const { mutate: updateSettings, isPending: isUpdatingSettings } = useMutation({
    mutationFn: updatePomodoroSettings,
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: pomodoroKeys.settings() })

      const previousSettings = queryClient.getQueryData(pomodoroKeys.settings())

      queryClient.setQueryData(pomodoroKeys.settings(), (oldSettings) => ({
        ...oldSettings,
        ...newSettings,
      }))

      return { previousSettings }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pomodoroKeys.settings() })
    },
    onError: (err, newSettings, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(pomodoroKeys.settings(), context.previousSettings)
      }
      console.error("Failed to update settings. Rolling back.", err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pomodoroKeys.settings() })
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
      await queryClient.cancelQueries({ queryKey: userKeys.auth() })
      await queryClient.cancelQueries({ queryKey: pomodoroKeys.leaderboard }) // Get the current user data from the cache. We'll save this to roll back if the mutation fails.

      const previousAuthUser = queryClient.getQueryData(userKeys.auth()) // Now, we'll optimistically update the user data in our local cache.

      queryClient.setQueryData(userKeys.auth(), (oldUser) => {
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
      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
      queryClient.invalidateQueries({ queryKey: pomodoroKeys.leaderboard })
    }, // If the request fails, we'll use the `context` to roll back to the old data.

    onError: (error, variables, context) => {
      if (context?.previousAuthUser) {
        queryClient.setQueryData(userKeys.auth(), context.previousAuthUser)
      }
      showAppToast(error.message, "error")
    },
  })
}

export const useGetStudyActivityFeed = (page) => {
  const { data, isLoading } = useQuery({
    queryKey: pomodoroKeys.studyActivityPage(page), // Add page to the queryKey
    queryFn: () => getStudyActivityFeed(page),
  })

  return {
    activityFeed: data?.activityFeed,
    totalPages: data?.totalPages,
    isLoading,
  }
}

export const useGetTotalLeaderboard = (page) => {
  const { data, isLoading, error } = useQuery({
    queryKey: pomodoroKeys.leaderboardTotalPage(page),
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

export const useGetMonthlyLeaderboard = (page) => {
  const { data, isLoading, error } = useQuery({
    queryKey: pomodoroKeys.leaderboardMonthlyPage(page),
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
    queryKey: pomodoroKeys.leaderboardWinners(),
    queryFn: getPreviousWinnersApi,
  })

  return { previousWinners, isLoadingPreviousWinners }
}
