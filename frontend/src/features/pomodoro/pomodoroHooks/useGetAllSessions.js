import { useQuery } from "@tanstack/react-query"
import { getAllSessionsApi } from "../../../api/pomodoroApi"

export const useGetAllSessions = () => {
  const { data: allSessions, isLoading: allSessionsLoading } = useQuery({
    queryKey: ["studyHistory"],
    queryFn: getAllSessionsApi,
  })

  return { allSessions, allSessionsLoading }
}
