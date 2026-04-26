import { useMutation, useQueryClient } from "@tanstack/react-query"
import { endStudySessionApi, updatePomodoroSettingsApi } from "../../../api/pomodoroApi"
import { showAppToast } from "../../../utils/showAppToast"
import { userKeys } from "../../users/usersHooks/userKeys"
import { pomodoroKeys } from "./pomodoroKeys"
import { wardrobeKeys } from "../../wardrobe/wardrobeHooks"

export const useEndStudySession = () => {
  const queryClient = useQueryClient()

  const { mutate: endStudySession } = useMutation({
    mutationFn: endStudySessionApi,
    retry: 2, // 3 total attempts
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    onMutate: async ({ duration }) => {
      await queryClient.cancelQueries({ queryKey: userKeys.auth() })
      await queryClient.cancelQueries({ queryKey: pomodoroKeys.leaderboard })

      const previousAuthUser = queryClient.getQueryData(userKeys.auth())

      queryClient.setQueryData(userKeys.auth(), (oldUser) => {
        if (!oldUser) return oldUser

        const newTotalStudyDuration = oldUser.totalStudyDuration + duration
        const newTotalSessionsCompleted = oldUser.totalSessionsCompleted + 1
        const newMonthlyStats = { ...oldUser.monthlyStats }

        newMonthlyStats.studyDuration += duration
        newMonthlyStats.sessionsCompleted += 1

        return {
          ...oldUser,
          totalStudyDuration: newTotalStudyDuration,
          totalSessionsCompleted: newTotalSessionsCompleted,
          monthlyStats: newMonthlyStats,
        }
      })

      return { previousAuthUser }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
      queryClient.invalidateQueries({ queryKey: pomodoroKeys.leaderboard })
      queryClient.invalidateQueries({ queryKey: wardrobeKeys.inventory() })
    },

    onError: (error, variables, context) => {
      if (context?.previousAuthUser) {
        queryClient.setQueryData(userKeys.auth(), context.previousAuthUser)
      }
      showAppToast(error.message, "error")
    },
  })

  return { endStudySession }
}

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