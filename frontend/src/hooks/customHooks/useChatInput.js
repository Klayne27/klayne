import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { showAppToast } from "../../utils/showAppToast"
import { useIsMobile } from "./useIsMobile"

const useTypingEmitter = (socket, typingConfig) => {
  const { startEvent, stopEvent } = typingConfig

  return useCallback(
    (isTyping, isEditing = false, dynamicPayload = {}) => {
      if (!socket) return
      const event = isTyping ? startEvent : stopEvent
      const finalPayload = { ...dynamicPayload, isEditing }

      socket.emit(event, finalPayload)
    },
    [socket, startEvent, stopEvent],
  )
}

const useAutoResizeTextarea = (inputRef, value) => {
  useEffect(() => {
    const textarea = inputRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [value, inputRef])
}

export const useChatInput = ({
  inputRef,
  fileInputRef,
  socket,
  chatStore,
  onSendMessage,
  onEditMessage,
  typingConfig,
}) => {
  const { authUser: currentUser } = useAuthUser()
  const {
    editingMessage,
    setEditingMessage,
    replyingToMessage,
    setReplyingToMessage,
    isRecording,
    setIsRecording,
    audioBlob,
    setAudioBlob,
    clearAudioBlob,
  } = chatStore

  const [textInput, setTextInput] = useState("")
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  const typingTimeoutRef = useRef(null)
  const hasSentTypingEvent = useRef(false)

  const isMobile = useIsMobile()

  // Encapsulated hooks
  const emitTyping = useTypingEmitter(socket, typingConfig)
  useAutoResizeTextarea(inputRef, textInput)

  // Effect to populate input when editing
  useEffect(() => {
    if (editingMessage) {
      setTextInput(editingMessage.text)
      inputRef.current?.focus()
    }
  }, [editingMessage, inputRef])

  // Cleanup effect for unmounting
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      emitTyping(false, false, typingConfig.payload)
    }
  }, [emitTyping, typingConfig.payload])

  const clearInputState = useCallback(() => {
    setTextInput("")
    setSelectedFile(null)
    setPreviewImage(null)
    setReplyingToMessage(null)
    setEditingMessage(null)
    clearAudioBlob()
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (inputRef.current) inputRef.current.focus()
  }, [setReplyingToMessage, setEditingMessage, fileInputRef, inputRef, clearAudioBlob])

  const handleTextInputChange = (e) => {
    const value = e.target.value
    setTextInput(value)

    clearTimeout(typingTimeoutRef.current)

    if (value.trim().length > 0) {
      if (!hasSentTypingEvent.current) {
        emitTyping(true, !!editingMessage, typingConfig.payload)
        hasSentTypingEvent.current = true
      }
      typingTimeoutRef.current = setTimeout(() => {
        // FIX: Add the payload here
        emitTyping(false, false, typingConfig.payload)
        hasSentTypingEvent.current = false
      }, 1500)
    } else {
      if (hasSentTypingEvent.current) {
        // FIX: Add the payload here too
        emitTyping(false, false, typingConfig.payload)
        hasSentTypingEvent.current = false
      }
    }
  }
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      return showAppToast("Only image files are supported.", "error")
    }
    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      return showAppToast("Image size cannot exceed 5MB.", "error")
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPreviewImage(reader.result)
    reader.readAsDataURL(file)
  }

  const handleImageButtonClick = (e) => {
    e.preventDefault()
    fileInputRef.current?.click()
    inputRef.current?.focus()
  }

  const handleStartRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "audio/webm" })
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        setAudioBlob(audioBlob)
        audioChunksRef.current = []
      }

      mediaRecorderRef.current.start()
      setIsRecording(true) // Reset other input states when recording starts
      setTextInput("")
      setSelectedFile(null)
      setPreviewImage(null)
    } catch (err) {
      console.error("Error accessing microphone:", err)
      showAppToast("Microphone access denied or an error occurred.", "error")
      setIsRecording(false)
    }
  }, [setIsRecording, setAudioBlob, setTextInput, setSelectedFile, setPreviewImage])

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [setIsRecording])

  const handleClearRecording = useCallback(() => {
    clearAudioBlob()
    inputRef.current?.focus()
  }, [clearAudioBlob, inputRef])

  const isSendButtonDisabled = useMemo(() => {
    if (isRecording) return true
    return !textInput.trim() && !selectedFile && !audioBlob
  }, [textInput, selectedFile, audioBlob, isRecording])

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearTimeout(typingTimeoutRef.current)
    emitTyping(false, false, typingConfig.payload)
    hasSentTypingEvent.current = false

    const content = textInput.trim()

    if (!content && !selectedFile && !audioBlob) return // <-- Check for audioBlob

    try {
      if (editingMessage) {
        await onEditMessage({ messageId: editingMessage._id, newText: content })
      } else {
        // Check if an audio message is being sent
        if (audioBlob) {
          await onSendMessage({
            text: content,
            file: audioBlob, // Change this from `voiceMessage: audioBlob` to `file: audioBlob`
            repliedToId: replyingToMessage?._id || null,
          })
        } else {
          // Existing logic for text/image messages
          await onSendMessage({
            text: content,
            file: selectedFile,
            repliedToId: replyingToMessage?._id || null,
          })
        }
      }

      clearInputState()
    } catch (error) {
      console.error("Failed to process message:", error)
      showAppToast(error.message || "An error occurred.", "error")
    }
  }

  const handleKeyDown = (e) => {
    if (isMobile) {
      return
    }

    if (e.key === "Enter") {
      if (!e.shiftKey) {
        e.preventDefault()
        handleSubmit(e)
      }
    }
  }

  const handleEmojiClick = useCallback(
    (emojiObject) => {
      setTextInput((prev) => prev + emojiObject.emoji)
      inputRef.current?.focus()
    },
    [inputRef],
  )

  const handleRemoveImage = () => {
    setSelectedFile(null)
    setPreviewImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    inputRef.current?.focus()
  }

  const handleCancelEdit = () => {
    setEditingMessage(null)
    setTextInput("")
    emitTyping(false, false, typingConfig.payload)
  }

  return {
    currentUser,
    textInput,
    setTextInput,
    selectedFile,
    previewImage,
    setPreviewImage,
    setSelectedFile,
    isSendButtonDisabled,
    handleTextInputChange,
    handleFileChange,
    handleSubmit,
    handleKeyDown,
    handleEmojiClick,
    handleRemoveImage,
    handleCancelEdit,
    handleImageButtonClick,
    handleStartRecording,
    handleStopRecording,
    handleClearRecording,
  }
}
