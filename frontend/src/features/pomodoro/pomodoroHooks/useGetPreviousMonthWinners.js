import { useQuery } from "@tanstack/react-query"
import { getPreviousMonthWinnersApi } from "../../../api/leaderboardApi"
import { pomodoroKeys } from "./pomodoroKeys"

export const useGetPreviousMonthWinners = () => {
  const { data: previousMonthWinners, isLoading: isLoadingPreviousMonthWinners } = useQuery({
    queryKey: pomodoroKeys.leaderboardMonthlyWinners(),
    queryFn: getPreviousMonthWinnersApi,
  })


  return { previousMonthWinners, isLoadingPreviousMonthWinners }
}
