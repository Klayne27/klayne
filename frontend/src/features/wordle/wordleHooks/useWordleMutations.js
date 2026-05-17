import { useMutation, useQueryClient } from "@tanstack/react-query"
import { submitWordleGuessApi } from "../../../api/wordleApi"
import { showAppToast } from "../../../utils/showAppToast"
import { wordleKeys } from "./wordleKeys"

export const useSubmitWordleGuess = () => {
  const queryClient = useQueryClient()

  const { mutate: submitGuess, isPending } = useMutation({
    mutationFn: submitWordleGuessApi,
    onSuccess: (data) => {
      queryClient.setQueryData(wordleKeys.today(), data)
      queryClient.invalidateQueries({ queryKey: wordleKeys.leaderboard() })

      if (data.attempt?.status === "won") {
        showAppToast(`Solved in ${data.attempt.guesses.length}!`, "success")
      } else if (data.attempt?.status === "lost") {
        showAppToast(`The word was ${data.answer?.toUpperCase()}`, "error")
      }
    },
    onError: (error) => {
      showAppToast(error.message, "error")
    },
  })

  return { submitGuess, isSubmittingGuess: isPending }
}
