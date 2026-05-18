import { useMutation, useQueryClient } from "@tanstack/react-query"
import { submitWordleGuessApi } from "../../../api/wordleApi"
import { showAppToast } from "../../../utils/showAppToast"
import { userKeys } from "../../users/usersHooks/userKeys"
import { wordleKeys } from "./wordleKeys"

export const useSubmitWordleGuess = (onAnimationComplete) => {
  const queryClient = useQueryClient()

  const { mutate: submitGuess, isPending } = useMutation({
    mutationFn: submitWordleGuessApi,
    onSuccess: (data) => {
      // NOTE: Do NOT update wordleKeys.today() cache here!
      // Instead, pass the data directly down to the commit callback to handle the flip updates

      const totalAnimationDuration = 2000 // Total layout time window for 5 tiles

      setTimeout(() => {
        // Commit the payload data to the layout cache ONLY after transitions finish
        queryClient.setQueryData(wordleKeys.today(), data)
        queryClient.invalidateQueries({ queryKey: wordleKeys.stats() })
        queryClient.invalidateQueries({ queryKey: wordleKeys.leaderboard() })

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

        // Clean up external triggers inside WordlePage.jsx
        if (onAnimationComplete) onAnimationComplete()
      }, totalAnimationDuration)
    },
    onError: (error) => {
      showAppToast(error.message || "Invalid guess selection")
    },
  })

  return { submitGuess, isSubmittingGuess: isPending }
}
