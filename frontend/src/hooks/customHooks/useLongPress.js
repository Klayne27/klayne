import { useRef, useCallback, useEffect } from "react"

export const useLongPress = (callback, duration = 500, isEnabled = true) => {
  const pressTimer = useRef(null)
  const isLongPressTriggered = useRef(false) // New ref to track if long press fired
  

  const handleTouchStart = useCallback(
    (e) => {
      e.stopPropagation()
      if (!isEnabled) return

      isLongPressTriggered.current = false
      pressTimer.current = setTimeout(() => {
        isLongPressTriggered.current = true
        callback(e)
      }, duration)
    },
    [callback, duration, isEnabled],
  )

  const handleTouchEnd = useCallback((e) => {
    e.stopPropagation()
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    if (isLongPressTriggered.current) {
      e.preventDefault()
      isLongPressTriggered.current = false
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    // If there's significant movement, cancel the long press
    // You might want to add a threshold here if needed
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    isLongPressTriggered.current = false // Reset if movement cancels it
  }, [])

  const handleTouchCancel = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    isLongPressTriggered.current = false // Reset
  }, [])

  useEffect(() => {
    return () => {
      if (pressTimer.current) {
        clearTimeout(pressTimer.current)
        pressTimer.current = null
      }
    }
  }, [])

  return {
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    handleTouchCancel,
  }
}
