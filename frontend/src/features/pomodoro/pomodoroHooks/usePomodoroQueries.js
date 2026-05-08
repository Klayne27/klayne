import { useQuery } from "@tanstack/react-query"
import {
  getActiveSessionApi,
  getAllSessionsApi,
  getPomodoroSettingsApi,
  getStudyActivityFeedApi,
} from "../../../api/pomodoroApi"
import {
  getMonthlyLeaderboardApi,
  getPreviousMonthWinnersApi,
  getPreviousWeekWinnersApi,
  getTotalLeaderboardApi,
  getWeeklyLeaderboardApi,
} from "../../../api/leaderboardApi"
import { pomodoroKeys } from "./pomodoroKeys"

export const useGetAllSessions = () => {
  const { data: allSessions, isLoading: allSessionsLoading } = useQuery({
    queryKey: ["studyHistory"],
    queryFn: getAllSessionsApi,
  })

  return { allSessions, allSessionsLoading }
}

export const useGetPomodoroSettings = () => {
  const { data: settings, isLoading: isSettingsLoading } = useQuery({
    queryKey: pomodoroKeys.settings(),
    queryFn: getPomodoroSettingsApi,
  })

  return { settings, isSettingsLoading }
}

export const useGetTotalLeaderboard = (page, options) => {
  const { data, isLoading, error } = useQuery({
    queryKey: pomodoroKeys.leaderboardTotalPage(page),
    queryFn: () => getTotalLeaderboardApi(page),
    ...options,
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

export const useGetMonthlyLeaderboard = (page, options) => {
  const { data, isLoading, error } = useQuery({
    queryKey: pomodoroKeys.leaderboardMonthlyPage(page),
    queryFn: () => getMonthlyLeaderboardApi(page),
    ...options,
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

export const useGetPreviousMonthWinners = () => {
  const { data: previousMonthWinners, isLoading: isLoadingPreviousMonthWinners } = useQuery({
    queryKey: pomodoroKeys.leaderboardMonthlyWinners(),
    queryFn: getPreviousMonthWinnersApi,
  })

  return { previousMonthWinners, isLoadingPreviousMonthWinners }
}

export const useGetWeeklyLeaderboard = (page, options = {}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: pomodoroKeys.leaderboardWeeklyPage(page),
    queryFn: () => getWeeklyLeaderboardApi(page),
    ...options,
  })

  return {
    leaderboard: data?.leaderboard,
    totalPages: data?.totalPages,
    currentPage: data?.currentPage,
    type: data?.type,
    currentWeekStart: data?.currentWeekStart,
    isLoading,
    error,
  }
}

export const useGetPreviousWeekWinners = () => {
  const { data: previousWeekWinners, isLoading: isLoadingPreviousWeekWinners } = useQuery({
    queryKey: pomodoroKeys.leaderboardWeeklyWinners(),
    queryFn: getPreviousWeekWinnersApi,
  })

  return { previousWeekWinners, isLoadingPreviousWeekWinners }
}

export const useGetStudyActivityFeed = (page) => {
  const { data, isLoading } = useQuery({
    queryKey: pomodoroKeys.studyActivityPage(page),
    queryFn: () => getStudyActivityFeedApi(page),
  })

  return {
    activityFeed: data?.activityFeed,
    totalPages: data?.totalPages,
    isLoading,
  }
}

export const useGetActiveSession = (enabled = true) => {
  const {
    data: serverSession,
    isSuccess,
    isError,
    error,
  } = useQuery({
    queryKey: pomodoroKeys.active(),
    queryFn: getActiveSessionApi,
    enabled,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  })

  return {
    serverSession: isSuccess ? serverSession : null,
    isSyncAttempted: enabled && (isSuccess || isError),
    isSyncError: isError,
    syncError: error,
  }
}
