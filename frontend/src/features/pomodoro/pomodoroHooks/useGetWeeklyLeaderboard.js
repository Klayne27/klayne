// useGetWeeklyLeaderboard.js
import { useQuery } from "@tanstack/react-query"
import { pomodoroKeys } from "./pomodoroKeys"
import { getWeeklyLeaderboardApi } from "../../../api/leaderboardApi"

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
