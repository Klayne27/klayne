import { useState, useCallback } from "react"
import { useDebounce } from "./useDebounce"
import { useSearchUsers } from "../../features/users/usersHooks/useUserMutations"

export const useMentionSuggestions = ({ textInput, setTextInput, inputRef }) => {
  const [mentionSearchTerm, setMentionSearchTerm] = useState("")
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)

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
      } else {
        setMentionSearchTerm("")
        setShowMentionSuggestions(false)
      }
    } else {
      setMentionSearchTerm("")
      setShowMentionSuggestions(false)
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

  const closeMentionSuggestions = useCallback(() => {
    setShowMentionSuggestions(false)
    setMentionSearchTerm("")
  }, [])

  return {
    mentionSearchTerm,
    debouncedMentionSearchTerm,
    showMentionSuggestions,
    suggestedUsers: suggestedUsers ?? [],
    isLoadingSuggestedUsers,
    handleMentionTextChange,
    handleSelectMention,
    closeMentionSuggestions,
  }
}
