// src/features/suggestions/suggestionHooks.js
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { SUGGESTIONS_KEY } from "./suggestionKeys"
import { showAppToast } from "../../../utils/showAppToast"
import { deleteSuggestionApi, submitSuggestionApi, updateSuggestionStatusApi } from "../../../api/suggestionApi"


export const useSubmitSuggestion = () => {
  const { mutate: submitSuggestion, isPending } = useMutation({
    mutationFn: submitSuggestionApi,
    onSuccess: () => showAppToast("Suggestion submitted. Thanks!", "success"),
    onError: (err) => showAppToast(err.message, "error"),
  })
  return { submitSuggestion, isPending }
}


export const useUpdateSuggestion = () => {
  const queryClient = useQueryClient()
  const { mutate: updateSuggestion, isPending } = useMutation({
    mutationFn: updateSuggestionStatusApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUGGESTIONS_KEY] })
      showAppToast("Updated.", "success")
    },
    onError: (err) => showAppToast(err.message, "error"),
  })
  return { updateSuggestion, isPending }
}

export const useDeleteSuggestion = () => {
  const queryClient = useQueryClient()
  const { mutate: deleteSuggestion } = useMutation({
    mutationFn: deleteSuggestionApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUGGESTIONS_KEY] })
      showAppToast("Deleted.", "success")
    },
    onError: (err) => showAppToast(err.message, "error"),
  })
  return { deleteSuggestion }
}
