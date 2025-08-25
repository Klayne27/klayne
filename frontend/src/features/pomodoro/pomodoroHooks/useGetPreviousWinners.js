import { useQuery } from "@tanstack/react-query"
import { getPreviousWinnersApi } from "../../../api/leaderboardApi"
import { pomodoroKeys } from "./pomodoroKeys"

export const useGetPreviousWinners = () => {
  const { data: previousWinners, isLoading: isLoadingPreviousWinners } = useQuery({
    queryKey: pomodoroKeys.leaderboardWinners(),
    queryFn: getPreviousWinnersApi,
  })

  return { previousWinners, isLoadingPreviousWinners }
}
