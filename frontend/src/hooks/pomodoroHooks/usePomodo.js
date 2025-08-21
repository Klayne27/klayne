import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  endStudySession,
  getLeaderboard,
  getPomodoroSettings,
  getStudyActivityFeed,
  startStudySession,
  updatePomodoroSettings,
} from "../../api/pomodoroApi"
import { showAppToast } from "../../utils/showAppToast"
import {
  getLeaderboardStats,
  getMonthlyLeaderboard,
  getPreviousWinnersApi,
  getTotalLeaderboard,
} from "../../api/leaderboardApi"

export const useGetPomodoroSettings = () => {
  const { data: settings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ["pomodoroSettings"],
    queryFn: getPomodoroSettings,
  })

  return { settings, isSettingsLoading }
}

export const useUpdatePomodoroSettings = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updatePomodoroSettings,
    onSuccess: () => {
      showAppToast("Settings updated!", "success")
      queryClient.invalidateQueries({ queryKey: ["pomodoroSettings"] })
    },
    onError: (error) => {
      showAppToast(error.message, "error")
    },
  })
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
    mutationFn: endStudySession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studyActivity"] })
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] })
      queryClient.invalidateQueries({ queryKey: ["authUser"] })
    },
    onError: (error) => {
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

// export const useGetLeaderboard = (page) => {
//   const { data, isLoading } = useQuery({
//     queryKey: ["leaderboard", page], // queryKey must include page to re-fetch when it changes
//     queryFn: () => getLeaderboard(page),
//   })

//   return {
//     leaderboard: data?.leaderboard,
//     totalPages: data?.totalPages,
//     isLoading,
//   }
// }

// export const useGetSessionCountLeaderboard = (page) => {
//   const { data, isLoading: isLoadingSessionCountLeaderboard } = useQuery({
//     queryKey: ["leaderboard", page], // queryKey must include page to re-fetch when it changes
//     queryFn: () => getSessionCountLeaderboard(page),
//   })

//   return {
//     sessionCountleaderboard: data?.leaderboard,
//     sessionCounttotalPages: data?.totalPages,
//     isLoadingSessionCountLeaderboard,
//   }
// }

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

// Hook for leaderboard statistics
export const useGetLeaderboardStats = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["leaderboard", "stats"],
    queryFn: getLeaderboardStats,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  return {
    stats: data,
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
