// hooks/customHooks/useMessageModalInteractions.js
import { useState, useCallback, useEffect } from "react"
import { useIsMobile } from "./useIsMobile"
import { useLongPress } from "./useLongPress" // Assuming this is your hook

export const useMessageModalInteractions = (
  messageId,
  setActiveMessageModalId,
  activeMessageModalId,
) => {
  const [isHovered, setIsHovered] = useState(false)
  const isMobile = useIsMobile()

  const handleLongPress = useCallback(() => {
    if (isMobile) {
      setActiveMessageModalId(messageId)
    }
  }, [isMobile, messageId, setActiveMessageModalId])

  const { handleTouchCancel, handleTouchEnd, handleTouchMove, handleTouchStart } = useLongPress(
    handleLongPress,
    500,
    isMobile, // Enable long press only if it's a mobile device
  )

  const handleMouseEnter = useCallback(() => {
    if (!isMobile) {
      setActiveMessageModalId(messageId)
      setIsHovered(true)
    }
  }, [isMobile, messageId, setActiveMessageModalId])

  const handleMouseLeave = useCallback(() => {
    if (!isMobile) {
      setActiveMessageModalId(null)
      setIsHovered(false)
    }
  }, [isMobile, setActiveMessageModalId])

  // Close actions modal on outside click for mobile
  useEffect(() => {
    const handleClickOutsideMessage = (e) => {
      if (activeMessageModalId && isMobile) {
        const messageModalElement = document.getElementById(`message-reaction-modal-${messageId}`)
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
  }, [activeMessageModalId, isMobile, setActiveMessageModalId, messageId])

  const showModal = activeMessageModalId === messageId
  const isMessageHighlighted = isHovered || showModal

  return {
    isHovered, // Still expose if needed for other visual cues
    handleMouseEnter,
    handleMouseLeave,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    handleTouchCancel,
    showModal,
    isMessageHighlighted,
  }
}
