import { useMutation, useQueryClient } from "@tanstack/react-query"
import { submitWordleGuessApi } from "../../../api/wordleApi"
import { showAppToast } from "../../../utils/showAppToast"
import { userKeys } from "../../users/usersHooks/userKeys"
import { wordleKeys } from "./wordleKeys"

export const useSubmitWordleGuess = () => {
  const queryClient = useQueryClient()

  const { mutate: submitGuess, isPending } = useMutation({
    mutationFn: submitWordleGuessApi,
    onSuccess: (data) => {
      // 1. Instantly update the cache data for structural state tracking
      queryClient.setQueryData(wordleKeys.today(), data)
      queryClient.invalidateQueries({ queryKey: wordleKeys.stats() })
      queryClient.invalidateQueries({ queryKey: wordleKeys.leaderboard() })

      // 2. Delay the Toast alerts to align with the completion of the tile flip sequence (~2200ms)
      setTimeout(() => {
        if (data.attempt?.status === "won") {
          showAppToast(`Solved in ${data.attempt.guesses.length}!`, "success")
        } else if (data.attempt?.status === "lost") {
          showAppToast(`The word was ${data.answer?.toUpperCase()}`, "error")
        }

        if (data.unlockedBadges?.length) {
          queryClient.invalidateQueries({ queryKey: userKeys.auth() })
          data.unlockedBadges.forEach((badge) => {
            showAppToast(`Wordle badge unlocked: ${badge.label}`, "success")
          })
        }
      }, 2200) // Matches your WordlePage.jsx final transition wrap-up timer!
    },
    onError: (error) => {
      showAppToast(error.message)
    },
  })

  return { submitGuess, isSubmittingGuess: isPending }
}