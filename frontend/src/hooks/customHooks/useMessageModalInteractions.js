import { useState, useCallback } from "react"
import { useIsMobile } from "./useIsMobile"
import { useLongPress } from "./useLongPress" 

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
    isMobile,
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

  const showModal = activeMessageModalId === messageId
  const isMessageHighlighted = isHovered || showModal

  return {
    isHovered,
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
