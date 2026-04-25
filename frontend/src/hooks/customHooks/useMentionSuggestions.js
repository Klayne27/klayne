import { useState, useCallback } from "react"
import { useDebounce } from "./useDebounce"
import { useSearchUsers } from "../../features/users/usersHooks/useUserMutations"

export const useMentionSuggestions = ({ textInput, setTextInput, inputRef }) => {
  const [mentionSearchTerm, setMentionSearchTerm] = useState("")
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [focusedMentionIndex, setFocusedMentionIndex] = useState(0) // NEW

  const debouncedMentionSearchTerm = useDebounce(mentionSearchTerm, 300)
  const { suggestedUsers, isLoadingSuggestedUsers } = useSearchUsers(debouncedMentionSearchTerm)

  const handleMentionTextChange = useCallback((e) => {
    const newText = e.target.value
    const lastAtIndex = newText.lastIndexOf("@")
    if (lastAtIndex !== -1) {
      const potential = newText.substring(lastAtIndex + 1)
      if (potential.length > 0 && !/\s/.test(potential)) {
        setMentionSearchTerm(potential)
        setShowMentionSuggestions(true)
        setFocusedMentionIndex(0) // reset on text change
      } else {
        setMentionSearchTerm("")
        setShowMentionSuggestions(false)
        setFocusedMentionIndex(0)
      }
    } else {
      setMentionSearchTerm("")
      setShowMentionSuggestions(false)
      setFocusedMentionIndex(0)
    }
  }, [])

  const handleSelectMention = useCallback(
    (username) => {
      const text = textInput
      const lastAt = text.lastIndexOf("@")
      if (lastAt === -1) return
      const fromAt = text.substring(lastAt)
      const match = fromAt.match(/^@([a-zA-Z0-9_]*)/)
      const partialLen = match?.[1]?.length ?? 0
      const newText =
        text.substring(0, lastAt) + `@${username} ` + text.substring(lastAt + 1 + partialLen)
      setTextInput(newText)
      setMentionSearchTerm("")
      setShowMentionSuggestions(false)
      setFocusedMentionIndex(0)
      setTimeout(() => {
        const input = inputRef.current
        if (input) {
          const pos = lastAt + username.length + 2
          input.setSelectionRange(pos, pos)
          input.focus()
        }
      }, 0)
    },
    [textInput, setTextInput, inputRef],
  )

  // NEW — intercepts Enter/ArrowUp/ArrowDown when the dropdown is open
  const handleMentionKeyDown = useCallback(
    (e) => {
      if (!showMentionSuggestions || !suggestedUsers?.length) return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setFocusedMentionIndex((i) => Math.min(i + 1, suggestedUsers.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setFocusedMentionIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault() // stop form submit / newline
        const target = suggestedUsers[focusedMentionIndex]
        if (target) handleSelectMention(target.username)
      } else if (e.key === "Escape") {
        setShowMentionSuggestions(false)
        setFocusedMentionIndex(0)
      }
    },
    [showMentionSuggestions, suggestedUsers, focusedMentionIndex, handleSelectMention],
  )

  const closeMentionSuggestions = useCallback(() => {
    setShowMentionSuggestions(false)
    setMentionSearchTerm("")
    setFocusedMentionIndex(0)
  }, [])

  return {
    mentionSearchTerm,
    debouncedMentionSearchTerm,
    showMentionSuggestions,
    suggestedUsers: suggestedUsers ?? [],
    isLoadingSuggestedUsers,
    focusedMentionIndex, // NEW
    handleMentionTextChange,
    handleMentionKeyDown, // NEW
    handleSelectMention,
    closeMentionSuggestions,
  }
}
