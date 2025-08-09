// hooks/customHooks/useMobileConversationLongPress.js
import { useCallback, useRef, useState } from "react"
import { useIsMobile } from "./useIsMobile"
import { useLongPress } from "./useLongPress"

function useMobileConversationLongPress() {
  const [activeConversationId, setActiveConversationId] = useState(null)
  const isMobile = useIsMobile()
  const longPressTriggeredRef = useRef(false) // Ref to track if long press fired

  // This callback now also sets our ref to true
  const handleLongPress = useCallback(
    (e) => {
      if (isMobile && e && e.convId) {
        longPressTriggeredRef.current = true
        setActiveConversationId(e.convId)
      }
    },
    [isMobile],
  )

  const handleCloseMenu = useCallback(() => {
    setActiveConversationId(null)
  }, [])

  // Get the original handlers from the useLongPress hook
  const {
    handleTouchCancel,
    handleTouchEnd,
    handleTouchMove,
    handleTouchStart: originalHandleTouchStart, // Rename the original handler
  } = useLongPress(handleLongPress, 500, isMobile)

  // Create a new handleTouchStart that wraps the original one
  const handleTouchStart = useCallback(
    (e) => {
      // ALWAYS reset the flag at the beginning of a touch event
      longPressTriggeredRef.current = false
      originalHandleTouchStart(e)
    },
    [originalHandleTouchStart],
  )

  return {
    activeConversationId,
    setActiveConversationId,
    handleCloseMenu,
    handleTouchStart, // Return our new wrapped function
    handleTouchEnd,
    handleTouchMove,
    handleTouchCancel,
    isMobile,
    longPressTriggeredRef, // Return the ref for the component to use
  }
}

export default useMobileConversationLongPress
