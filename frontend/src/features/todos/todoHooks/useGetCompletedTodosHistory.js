import { useQuery } from "@tanstack/react-query"
import { getCompletedTodosHistoryApi } from "../../../api/todoApi"

export const useGetCompletedTodosHistory = () => {
  return useQuery({
    queryKey: ["completedTodosHistory"],
    queryFn: getCompletedTodosHistoryApi,
  })
}
