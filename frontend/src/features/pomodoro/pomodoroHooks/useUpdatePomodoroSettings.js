import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updatePomodoroSettingsApi } from "../../../api/pomodoroApi"
import { pomodoroKeys } from "./pomodoroKeys"

export const useUpdatePomodoroSettings = () => {
  const queryClient = useQueryClient()

  const { mutate: updateSettings, isPending: isUpdatingSettings } = useMutation({
    mutationFn: updatePomodoroSettingsApi,
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: pomodoroKeys.settings() })

      const previousSettings = queryClient.getQueryData(pomodoroKeys.settings())

      queryClient.setQueryData(pomodoroKeys.settings(), (oldSettings) => ({
        ...oldSettings,
        ...newSettings,
      }))

      return { previousSettings }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pomodoroKeys.settings() })
    },
    onError: (err, newSettings, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(pomodoroKeys.settings(), context.previousSettings)
      }
      console.error("Failed to update settings. Rolling back.", err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pomodoroKeys.settings() })
    },
  })

  return { updateSettings, isUpdatingSettings }
}
