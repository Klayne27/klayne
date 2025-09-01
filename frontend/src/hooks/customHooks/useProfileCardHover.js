import { useState, useRef, useCallback, useEffect } from "react"
import { useGetUserProfile } from "../../features/users/usersHooks/useGetUserProfile"

const HOVER_DELAY_MS = 500 // Time to wait before showing the modal
const LEAVE_DELAY_MS = 300 // Time to wait before hiding the modal after leaving

export const useProfileCardHover = () => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    username: null,
    position: { top: 0, left: 0 },
  })

  const openTimerRef = useRef(null)
  const closeTimerRef = useRef(null)

  const { userProfile, isLoading: isUserLoading } = useGetUserProfile(modalState.username)

  // Clears any scheduled open or close actions
  const clearTimers = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const close = useCallback(() => {
    clearTimers()
    setModalState({ isOpen: false, username: null, position: { top: 0, left: 0 } })
  }, [clearTimers])

  // --- Event Handlers for the TRIGGER element (e.g., avatar, username) ---

  const handleMouseEnter = useCallback(
    (user, event) => {
      clearTimers() // Cancel any pending close action

      // If modal is already open for the same user, we're good.
      if (modalState.isOpen && modalState.username === user.username) {
        return
      }

      const rect = event.currentTarget.getBoundingClientRect()
      const position = {
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX,
      }

      // Schedule the modal to open
      openTimerRef.current = setTimeout(() => {
        setModalState({
          isOpen: true,
          username: user.username,
          position: position,
        })
      }, HOVER_DELAY_MS)
    },
    [modalState.isOpen, modalState.username, clearTimers],
  )

  const handleMouseLeave = useCallback(() => {
    clearTimers() // Cancel any pending open action

    // Schedule the modal to close
    closeTimerRef.current = setTimeout(close, LEAVE_DELAY_MS)
  }, [clearTimers, close])

  // --- Event Handlers for the MODAL element ---

  const handleModalEnter = useCallback(() => {
    // If the mouse moves onto the modal, it shouldn't close.
    clearTimers()
  }, [clearTimers])

  // When the mouse leaves the modal, schedule it to close.
  // The logic is identical to leaving the trigger element.
  const handleModalLeave = handleMouseLeave

  // Clean up timers when the component unmounts
  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  return {
    modalState,
    userProfile,
    isUserLoading,
    handleMouseEnter, // For trigger element
    handleMouseLeave, // For trigger element
    handleModalEnter, // For modal element
    handleModalLeave, // For modal element
    cleanup: clearTimers, // You can keep this export if needed elsewhere
  }
}
