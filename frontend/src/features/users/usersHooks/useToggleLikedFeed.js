import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toggleLikedFeedPrivacyApi } from "../../../api/usersApi"
import { userKeys } from "./userKeys"

export const useToggleLikedFeedPrivacy = () => {
  const queryClient = useQueryClient()

  const { mutate: toggleLikedFeedPrivacy, isLoading: isTogglingPrivacy } = useMutation({
    mutationFn: toggleLikedFeedPrivacyApi,
    onMutate: async (newIsPrivateValue) => {
      await queryClient.cancelQueries({ queryKey: userKeys.auth() })

      const previousAuthUser = queryClient.getQueryData(userKeys.auth())

      if (previousAuthUser) {
        queryClient.setQueryData(userKeys.auth(), {
          ...previousAuthUser,
          isLikedFeedPrivate: newIsPrivateValue,
        })
      }

      return { previousAuthUser }
    },

    onError: (err, newIsPrivateValue, context) => {
      console.error("Failed to toggle liked feed privacy, rolling back.", err)
      if (context?.previousAuthUser) {
        queryClient.setQueryData(userKeys.auth(), context.previousAuthUser)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
    },
  })

  return { toggleLikedFeedPrivacy, isTogglingPrivacy }
}
