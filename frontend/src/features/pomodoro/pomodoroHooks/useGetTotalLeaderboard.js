import { useQuery } from "@tanstack/react-query"
import { pomodoroKeys } from "./pomodoroKeys"
import { getTotalLeaderboardApi } from "../../../api/leaderboardApi"

export const useGetTotalLeaderboard = (page, options) => {
  const { data, isLoading, error } = useQuery({
    queryKey: pomodoroKeys.leaderboardTotalPage(page),
    queryFn: () => getTotalLeaderboardApi(page),
    ...options
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
