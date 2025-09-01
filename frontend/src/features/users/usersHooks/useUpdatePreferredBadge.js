import { useMutation, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { userKeys } from "./userKeys"
import { showAppToast } from "../../../utils/showAppToast"
import { updatePreferredBadgeApi } from "../../../api/usersApi"

export const useUpdatePreferredBadge = () => {
  const queryClient = useQueryClient()

  const { mutate: updateBadge } = useMutation({
    mutationFn: updatePreferredBadgeApi,
    onSuccess: () => {
      showAppToast("Badge preference updated!", "success") // Invalidate the user query to refetch the new preferredBadge
      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return { updateBadge }
}
