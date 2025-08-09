import { useCallback, useState } from "react"
import { useIsMobile } from "./useIsMobile"
import { useLongPress } from "./useLongPress"
// import { useNavigate } from "react-router-dom"

function useMobileConversationLongPress() {
  const [activeConversationId, setActiveConversationId] = useState(null)
  const isMobile = useIsMobile()
  // const navigate = useNavigate()

  const handleLongPress = useCallback(
    (e) => {
      if (isMobile && e && e.convId) {
        setActiveConversationId(e.convId)
      }
    },
    [isMobile],
  )

  const handleCloseMenu = useCallback(() => {
    setActiveConversationId(null)
    // setTimeout(() => {
    //   navigate("/messages")
    // }, 0)
  }, [])

  const { handleTouchCancel, handleTouchEnd, handleTouchMove, handleTouchStart } = useLongPress(
    handleLongPress,
    500,
    isMobile,
  )

  return {
    activeConversationId,
    setActiveConversationId,
    handleCloseMenu,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    handleTouchCancel,
    isMobile,
  }
}

export default useMobileConversationLongPress
