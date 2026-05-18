import { useMutation, useQueryClient } from "@tanstack/react-query"
import { submitWordleGuessApi } from "../../../api/wordleApi"
import { showAppToast } from "../../../utils/showAppToast"
import { userKeys } from "../../users/usersHooks/userKeys"
import { wordleKeys } from "./wordleKeys"

export const useSubmitWordleGuess = () => {
  const { mutate: submitGuess, isPending: isSubmittingGuess } = useMutation({
    mutationFn: submitWordleGuessApi,
  })
  return { submitGuess, isSubmittingGuess }
}
