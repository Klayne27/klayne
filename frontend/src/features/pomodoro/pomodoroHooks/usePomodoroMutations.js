import { useMutation, useQueryClient } from "@tanstack/react-query"
import { endStudySessionApi, updatePomodoroSettingsApi } from "../../../api/pomodoroApi"
import { showAppToast } from "../../../utils/showAppToast"
import { userKeys } from "../../users/usersHooks/userKeys"
import { pomodoroKeys } from "./pomodoroKeys"
import { wardrobeKeys } from "../../wardrobe/wardrobeHooks"
import { useCallback, useRef } from "react"

export const useEndStudySession = () => {
  const queryClient = useQueryClient()
  const inFlightRef = useRef(false) // ← NEW

  const { mutate: endStudySessionRaw } = useMutation({
    mutationFn: endStudySessionApi,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    onMutate: async ({ duration }) => {
      await queryClient.cancelQueries({ queryKey: userKeys.auth() })
      await queryClient.cancelQueries({ queryKey: pomodoroKeys.leaderboard })
      const previousAuthUser = queryClient.getQueryData(userKeys.auth())

      queryClient.setQueryData(userKeys.auth(), (oldUser) => {
        if (!oldUser) return oldUser
        return {
          ...oldUser,
          totalStudyDuration: oldUser.totalStudyDuration + duration,
          totalSessionsCompleted: oldUser.totalSessionsCompleted + 1,
          monthlyStats: {
            ...oldUser.monthlyStats,
            studyDuration: oldUser.monthlyStats.studyDuration + duration,
            sessionsCompleted: oldUser.monthlyStats.sessionsCompleted + 1,
          },
        }
      })
      return { previousAuthUser }
    },
    onSuccess: () => {
      inFlightRef.current = false // ← reset
      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
      queryClient.invalidateQueries({ queryKey: pomodoroKeys.leaderboard })
      queryClient.invalidateQueries({ queryKey: wardrobeKeys.inventory() })
    },
    onError: (error, variables, context) => {
      inFlightRef.current = false // ← reset
      if (context?.previousAuthUser) {
        queryClient.setQueryData(userKeys.auth(), context.previousAuthUser)
      }
      // Don't toast here — handleSessionEnd already shows "Continuing..." toast
    },
  })

  // Wrap mutate to prevent duplicate fires for the same session
  const endStudySession = useCallback(
    (variables, options) => {
      if (inFlightRef.current) return // ← already in-flight, skip
      inFlightRef.current = true
      endStudySessionRaw(variables, options)
    },
    [endStudySessionRaw],
  )

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