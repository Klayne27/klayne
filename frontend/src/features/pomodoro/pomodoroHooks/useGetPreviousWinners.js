import { useQuery } from "@tanstack/react-query"
import { getPreviousMonthWinnersApi } from "../../../api/leaderboardApi"
import { pomodoroKeys } from "./pomodoroKeys"

export const useGetPreviousMonthWinners = () => {
  const { data: previousMonth, isLoading: isLoadingPreviousMonthWinners } = useQuery({
    queryKey: pomodoroKeys.leaderboardMonthlyWinners(),
    queryFn: getPreviousMonthWinnersApi,
  })

  return { previousMonth, isLoadingPreviousMonthWinners }
}
