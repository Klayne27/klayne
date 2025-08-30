import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toggleLikedFeedPrivacyApi } from "../../../api/usersApi"
import { userKeys } from "./userKeys"

export const useToggleLikedFeedPrivacy = () => {
  // Get the query client instance
  const queryClient = useQueryClient()

  const { mutate: toggleLikedFeedPrivacy, isLoading: isTogglingPrivacy } = useMutation({
    mutationFn: toggleLikedFeedPrivacyApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
    },
  })

  return { toggleLikedFeedPrivacy, isTogglingPrivacy }
}
