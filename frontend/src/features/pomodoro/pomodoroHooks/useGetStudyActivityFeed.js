import { useQuery } from "@tanstack/react-query"
import { getStudyActivityFeedApi } from "../../../api/pomodoroApi"
import { pomodoroKeys } from "./pomodoroKeys"

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
