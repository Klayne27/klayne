import { useCallback } from "react"
import { usePostModalStore } from "../../store/usePostModalStore"
import { POLL_CHOICE_MAX_LENGTH } from "../../constants/numberConstants"

export const usePollModal = () => {
  const {
    showPollInputs,
    pollChoices,
    focusedPollInputIndex,
    setShowPollInputs,
    updatePollChoice,
    addPollChoice,
    removePollChoice,
    setFocusedPollInputIndex,
    clearConflictingStates,
  } = usePostModalStore()

  const togglePoll = useCallback(() => {
    if (!showPollInputs) {
      clearConflictingStates(["poll"])
    }
    setShowPollInputs(!showPollInputs)
  }, [showPollInputs, setShowPollInputs, clearConflictingStates])

  const removePoll = useCallback(() => {
    setShowPollInputs(false)
  }, [setShowPollInputs])

  const validatePoll = useCallback(() => {
    const filledChoices = pollChoices.filter((choice) => choice.text.trim() !== "")
    if (filledChoices.length < 2) {
      return { valid: false, message: "Polls must have at least two options." }
    }
    if (filledChoices.some((choice) => choice.text.length > POLL_CHOICE_MAX_LENGTH)) {
      return {
        valid: false,
        message: `Poll options cannot exceed ${POLL_CHOICE_MAX_LENGTH} characters.`,
      }
    }
    return { valid: true, choices: filledChoices }
  }, [pollChoices])

  return {
    showPollInputs,
    pollChoices,
    focusedPollInputIndex,
    togglePoll,
    removePoll,
    updatePollChoice,
    addPollChoice,
    removePollChoice,
    setFocusedPollInputIndex,
    validatePoll,
  }
}
