import { useState, useRef, useCallback, useEffect } from "react"
import { useGetUserProfile } from "../../features/users/usersHooks/useUserQueries"

const HOVER_DELAY_MS = 500 
const LEAVE_DELAY_MS = 300 

export const useProfileCardHover = () => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    username: null,
    position: { top: 0, left: 0 },
  })

  const openTimerRef = useRef(null)
  const closeTimerRef = useRef(null)

  const { userProfile, isLoading: isUserLoading } = useGetUserProfile(modalState.username)

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

  const handleMouseEnter = useCallback(
    (user, event) => {
      clearTimers() 

      if (modalState.isOpen && modalState.username === user.username) {
        return
      }

      const rect = event.currentTarget.getBoundingClientRect()
      const position = {
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX,
      }

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
    clearTimers()

    closeTimerRef.current = setTimeout(close, LEAVE_DELAY_MS)
  }, [clearTimers, close])


  const handleModalEnter = useCallback(() => {
    clearTimers()
  }, [clearTimers])

  const handleModalLeave = handleMouseLeave

  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  return {
    modalState,
    userProfile,
    isUserLoading,
    handleMouseEnter,
    handleMouseLeave,
    handleModalEnter,
    handleModalLeave,
    cleanup: clearTimers,
  }
}
