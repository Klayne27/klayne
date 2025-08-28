// File: hooks/useVacationMode.js

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getVacationModeStatusApi, toggleVacationModeApi } from "../../../api/usersApi"
import { showAppToast } from "../../../utils/showAppToast"

export const useVacationMode = () => {
  const queryClient = useQueryClient()

  const {
    data: vacationModeStatus,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["vacationMode"],
    queryFn: getVacationModeStatusApi,
  })

  const { mutate: toggleVacationMode, isPending: isToggling } = useMutation({
    mutationFn: toggleVacationModeApi,

    // ⭐ OPTIMISTIC UPDATE LOGIC
    onMutate: async (newIsVacationMode) => {
      await queryClient.cancelQueries({ queryKey: ["vacationMode"] })

      const previousVacationMode = queryClient.getQueryData(["vacationMode"])

      queryClient.setQueryData(["vacationMode"], { isVacationMode: newIsVacationMode })

      return { previousVacationMode }
    },

    onError: (err, newIsVacationMode, context) => {
      // Revert the UI to the previous data on failure
      queryClient.setQueryData(["vacationMode"], context.previousVacationMode)
      showAppToast("Failed to toggle vacation mode. Please try again.", "error")
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["vacationMode"] })
    },
  })

  return {
    vacationModeStatus: vacationModeStatus?.isVacationMode,
    isLoading,
    isError,
    error,
    toggleVacationMode,
    isToggling,
  }
}
