import { useMutation, useQueryClient } from "@tanstack/react-query"
import { endStudySessionApi } from "../../../api/pomodoroApi"
import { showAppToast } from "../../../utils/showAppToast"
import { userKeys } from "../../users/usersHooks/userKeys"
import { pomodoroKeys } from "./pomodoroKeys"

export const useEndStudySession = () => {
  const queryClient = useQueryClient()

  const { mutate: endStudySession } = useMutation({
    mutationFn: endStudySessionApi,
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
