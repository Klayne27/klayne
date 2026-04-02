import { useQuery } from "@tanstack/react-query"
import { pomodoroKeys } from "./pomodoroKeys"
import { getMonthlyLeaderboardApi } from "../../../api/leaderboardApi"

export const useGetMonthlyLeaderboard = (page, options) => {
  const { data, isLoading, error } = useQuery({
    queryKey: pomodoroKeys.leaderboardMonthlyPage(page),
    queryFn: () => getMonthlyLeaderboardApi(page),
    ...options
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
