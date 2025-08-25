import { useQuery } from "@tanstack/react-query"
import { pomodoroKeys } from "./pomodoroKeys"
import { getPomodoroSettingsApi } from "../../api/pomodoroApi"

export const useGetPomodoroSettings = () => {
  const { data: settings, isLoading: isSettingsLoading } = useQuery({
    queryKey: pomodoroKeys.settings(),
    queryFn: getPomodoroSettingsApi,
  })

  return { settings, isSettingsLoading }
}
