import { useRef, useCallback, useEffect } from "react"

export const useLongPress = (callback, duration = 500, isEnabled = true) => {
  const pressTimer = useRef(null)
  const isLongPressTriggered = useRef(false)
  

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
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    isLongPressTriggered.current = false 
  }, [])

  const handleTouchCancel = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    isLongPressTriggered.current = false
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
