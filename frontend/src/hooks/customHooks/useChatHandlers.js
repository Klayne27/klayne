import { useCallback, useEffect } from "react"
import { useAppStore } from "../../store/useAppStore"

export const useChatHandlers = ({
  message,
  setShowMoreActionsModal,
  addReaction,
  chatStore,
  isMobile,
  chatInputRef,
  handleCloseEmojiPickerPopover,
  handleOpenEmojiPickerPopover,
}) => {
  const { setReplyingToMessage, setEditingMessage, activeMessageModalId, setActiveMessageModalId } =
    chatStore()

  const openImageModal = useAppStore((state) => state.openImageModal)

  // const openEmojiPickerWithModalClose = (e) => {
  //   handleOpenEmojiPickerPopover(e, setShowMoreActionsModal)
  // }

  const handleJumpToOriginalMessage = (messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`)
    if (messageElement) {
      messageElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })

      messageElement.classList.add("highlight-message")

      setTimeout(() => {
        messageElement.classList.remove("highlight-message")
      }, 1500)
    }
  }
  //   const handleDeleteOwnMessage = () => {
  //     deleteOwnMessage(message._id)
  //     setShowMoreActionsModal(false)
  //   }

  const handleReactionClick = (messageId, emoji) => {
    addReaction({ messageId, emoji })
    setActiveMessageModalId(null)
  }

  const handleEditClick = () => {
    setEditingMessage(message)
    setShowMoreActionsModal(false)
  }

  const handleEmojiSelect = (emojiObject) => {
    handleReactionClick(message._id, emojiObject.emoji)
    handleCloseEmojiPickerPopover()
  }

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.text)
    setShowMoreActionsModal(false)
  }

  const handleReplyClick = () => {
    chatInputRef.current.focus()
    setReplyingToMessage(message)
    setShowMoreActionsModal(false)
  }

  const handleImageClick = () => {
    openImageModal(message.img)
  }

  const handleCloseMoreActionsModal = useCallback(() => {
    setShowMoreActionsModal(false)
  }, [setShowMoreActionsModal])

  useEffect(() => {
    const handleClickOutsideMessage = (e) => {
      if (activeMessageModalId && isMobile) {
        const messageModalElement = document.getElementById(`message-reaction-modal-${message._id}`)
        if (messageModalElement && !messageModalElement.contains(e.target)) {
          setActiveMessageModalId(null)
        }
      }
    }

    if (activeMessageModalId) {
      document.addEventListener("click", handleClickOutsideMessage)
    }

    return () => {
      document.removeEventListener("click", handleClickOutsideMessage)
    }
  }, [activeMessageModalId, isMobile, setActiveMessageModalId, message._id])

  return {
    // openEmojiPickerWithModalClose,
    handleJumpToOriginalMessage,
    handleReactionClick,
    handleEditClick,
    handleEmojiSelect,
    handleCopyMessage,
    handleReplyClick,
    handleImageClick,
    handleCloseMoreActionsModal,
  }
}
