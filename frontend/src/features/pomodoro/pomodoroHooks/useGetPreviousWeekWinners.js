// useGetPreviousWeekWinners.js
import { useQuery } from "@tanstack/react-query"
import { getPreviousWeekWinnersApi } from "../../../api/leaderboardApi"
import { pomodoroKeys } from "./pomodoroKeys"

export const useGetPreviousWeekWinners = () => {
  const { data: previousWeekWinners, isLoading: isLoadingPreviousWeekWinners } = useQuery({
    queryKey: pomodoroKeys.leaderboardWeeklyWinners(),
    queryFn: getPreviousWeekWinnersApi,
  })

  return { previousWeekWinners, isLoadingPreviousWeekWinners }
}
