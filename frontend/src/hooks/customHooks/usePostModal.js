import { useCallback, useRef, useEffect } from "react"

import { usePostModalStore } from "../../store/usePostModalStore"
import { useSearchUsers } from "../../features/users/usersHooks/userSearchUsers"
import { useDebounce } from "./useDebounce"
import { usePasteHandler } from "./usePasteHandler"
import { showAppToast } from "../../utils/showAppToast"
import { MAX_FILE_SIZE_MB } from "../../constants/numberConstants"

export const usePostModal = () => {
  const {
    input,
    selectedFile,
    previewImage,
    mentionQuery,
    mentionStartIndex,
    showMentionSuggestions,
    setInput,
    setMentionQuery,
    setMentionStartIndex,
    setShowMentionSuggestions,
    setSelectedFile,
    setPreviewImage,
    clearConflictingStates,
  } = usePostModalStore()

  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const suggestionBoxRef = useRef(null)

  const debouncedMentionSearchTerm = useDebounce(mentionQuery, 300)
  const { suggestedUsers, isLoadingSuggestedUsers } = useSearchUsers(debouncedMentionSearchTerm)

  const adjustTextareaHeight = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
      inputRef.current.style.height = inputRef.current.scrollHeight + "px"
    }
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [input, adjustTextareaHeight])

  const handlePaste = usePasteHandler({
    inputRef,
    input,
    setInput,
    setSelectedFile,
    setPreviewImage,
    fileInputRef,
  })

  const handleTextChange = useCallback(
    (e) => {
      const newText = e.target.value
      setInput(newText)

      const cursorPosition = e.target.selectionStart
      const textBeforeCursor = newText.substring(0, cursorPosition)
      const lastAtIndex = textBeforeCursor.lastIndexOf("@")

      if (
        lastAtIndex !== -1 &&
        (lastAtIndex === 0 || /\s/.test(textBeforeCursor[lastAtIndex - 1]))
      ) {
        const possibleMention = textBeforeCursor.substring(lastAtIndex)
        const mentionMatch = possibleMention.match(/^@([\p{L}\p{N}_]*)$/u)

        if (mentionMatch) {
          setMentionQuery(mentionMatch[1])
          setMentionStartIndex(lastAtIndex)
          setShowMentionSuggestions(true)
          return
        }
      }

      setMentionQuery("")
      setMentionStartIndex(-1)
      setShowMentionSuggestions(false)
    },
    [setInput, setMentionQuery, setMentionStartIndex, setShowMentionSuggestions],
  )

  const handleMentionSelect = useCallback(
    (username) => {
      const currentText = input
      const startReplaceIndex = mentionStartIndex

      const textFromAt = currentText.substring(mentionStartIndex)
      const match = textFromAt.match(/^@([\p{L}\p{N}_]*)/u)
      let partialMentionLength = 0
      if (match && match[1]) {
        partialMentionLength = match[1].length
      }

      const endReplaceIndex = mentionStartIndex + 1 + partialMentionLength
      const newText =
        currentText.substring(0, startReplaceIndex) +
        `@${username} ` +
        currentText.substring(endReplaceIndex)

      setInput(newText)
      setMentionQuery("")
      setMentionStartIndex(-1)
      setShowMentionSuggestions(false)

      const newCursorPosition = startReplaceIndex + `@${username} `.length
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition)
          adjustTextareaHeight()
        }
      }, 0)
    },
    [
      input,
      mentionStartIndex,
      setInput,
      setMentionQuery,
      setMentionStartIndex,
      setShowMentionSuggestions,
      adjustTextareaHeight,
    ],
  )

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files[0]
      if (file) {
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
          showAppToast("Unsupported file type. Please select an image or a video.", "error")
          setSelectedFile(null)
          setPreviewImage(null)
          if (fileInputRef.current) fileInputRef.current.value = null
          return
        }

        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          showAppToast(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`, "error")
          setSelectedFile(null)
          setPreviewImage(null)
          if (fileInputRef.current) fileInputRef.current.value = null
          return
        }

        setSelectedFile(file)
        setPreviewImage(URL.createObjectURL(file))
        clearConflictingStates(["file"])
      } else {
        setSelectedFile(null)
        setPreviewImage(null)
      }
    },
    [setSelectedFile, setPreviewImage, clearConflictingStates],
  )

  const removeFile = useCallback(() => {
    setSelectedFile(null)
    setPreviewImage(null)
    if (fileInputRef.current) fileInputRef.current.value = null
  }, [setSelectedFile, setPreviewImage])

  return {
    // State
    input,
    selectedFile,
    previewImage,
    showMentionSuggestions,
    suggestedUsers,
    isLoadingSuggestedUsers,

    // Refs
    inputRef,
    fileInputRef,
    suggestionBoxRef,

    // Handlers
    handleTextChange,
    handleMentionSelect,
    handleFileChange,
    handlePaste,
    removeFile,
    adjustTextareaHeight,
  }
}
