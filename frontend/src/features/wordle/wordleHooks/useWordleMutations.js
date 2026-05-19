import { useMutation, useQueryClient } from "@tanstack/react-query"
import { submitWordleGuessApi } from "../../../api/wordleApi"
import { showAppToast } from "../../../utils/showAppToast"
import { userKeys } from "../../users/usersHooks/userKeys"
import { wordleKeys } from "./wordleKeys"
import { useCallback } from "react"

export const useSubmitWordleGuess = () => {
  const queryClient = useQueryClient()

  const invalidateLeaderboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: wordleKeys.leaderboard() })
  }, [queryClient])

  const { mutate: submitGuess, isPending } = useMutation({
    mutationFn: submitWordleGuessApi,
    onSuccess: (data) => {
      // 1. Instantly update the cache data for structural state tracking
      queryClient.setQueryData(wordleKeys.today(), data)
      queryClient.invalidateQueries({ queryKey: wordleKeys.stats() })
      // queryClient.invalidateQueries({ queryKey: wordleKeys.leaderboard() })

      setTimeout(() => {
        if (data.unlockedBadges?.length) {
          queryClient.invalidateQueries({ queryKey: userKeys.auth() })
        }
      }, 2200)

      // 2. Delay the Toast alerts to align with the completion of the tile flip sequence (~2200ms)
      setTimeout(() => {
        // ← remove the "won" / "lost" toasts — the result modal covers these

        if (data.unlockedBadges?.length) {
          queryClient.invalidateQueries({ queryKey: userKeys.auth() })
          // badge toasts can stay if you want them alongside the modal badge section
        }
      }, 2200)
    },
    onError: (error) => {
      showAppToast(error.message)
    },
  })

  return { submitGuess, isSubmittingGuess: isPending, invalidateLeaderboard}
}
