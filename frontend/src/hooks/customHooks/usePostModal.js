import { useCallback, useRef, useEffect } from "react"

import { usePostModalStore } from "../../store/usePostModalStore"
import { useDebounce } from "./useDebounce"
import { usePasteHandler } from "./usePasteHandler"
import { showAppToast } from "../../utils/showAppToast"
import { MAX_FILE_SIZE_MB } from "../../constants/numberConstants"
import { useSearchUsers } from "../../features/users/usersHooks/useUserMutations"
import { useMentionSuggestions } from "./useMentionSuggestions"

export const usePostModal = () => {
  const {
    input,
    selectedFile,
    previewImage,
    setInput,
    setSelectedFile,
    setPreviewImage,
    clearConflictingStates,
  } = usePostModalStore()

  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const suggestionBoxRef = useRef(null)

const {
  debouncedMentionSearchTerm,
  showMentionSuggestions,
  suggestedUsers,
  isLoadingSuggestedUsers,
  focusedMentionIndex,
  handleMentionTextChange,
  handleMentionKeyDown,
  handleSelectMention,
  closeMentionSuggestions,
} = useMentionSuggestions({
  textInput: input,
  setTextInput: setInput,
  inputRef,
})

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
    handleMentionTextChange(e)
  },
  [setInput, handleMentionTextChange],
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
  input,
  selectedFile,
  previewImage,
  showMentionSuggestions,
  suggestedUsers,
  isLoadingSuggestedUsers,
  focusedMentionIndex, // NEW
  handleMentionTextChange, // NEW
  handleMentionKeyDown, // NEW
  handleSelectMention, // now from hook
  closeMentionSuggestions, // NEW
  inputRef,
  fileInputRef,
  suggestionBoxRef,
  handleTextChange,
  handleFileChange,
  handlePaste,
  removeFile,
  adjustTextareaHeight,
}
}
