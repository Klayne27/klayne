import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateStatusPreferenceApi } from "../../../api/usersApi"
import { showAppToast } from "../../../utils/showAppToast"
import { userKeys } from "./userKeys"

export const useUpdateStatusPreference = () => {
  const queryClient = useQueryClient()

  const { mutate: updateStatus, isPending: isUpdatingStatus } = useMutation({
    mutationFn: updateStatusPreferenceApi,
    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey: userKeys.auth() })
      const previousAuthUser = queryClient.getQueryData(userKeys.auth())

      queryClient.setQueryData(userKeys.auth(), (oldData) => {
        return {
          ...oldData,
          statusPreference: status,
        }
      })

      return { previousAuthUser }
    },
    onSuccess: () => {
      //   showAppToast("Status updated", "success")
      // queryClient.invalidateQueries(userKeys.auth())
    },
    onError: (context) => {
      queryClient.setQueryData(userKeys.auth(), context.previousAuthUser)
    },
  })

  return { updateStatus, isUpdatingStatus }
}
