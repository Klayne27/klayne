import { useRef, useCallback, useEffect } from "react"

export const useLongPress = (callback, duration = 500, isEnabled = true) => {
  const pressTimer = useRef(null)

  // Memoized handlers
  const handleTouchStart = useCallback(
    (e) => {
      e.stopPropagation()
      if (!isEnabled) return

      pressTimer.current = setTimeout(() => {
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
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }, [])

  const handleTouchCancel = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }, [])

  // Cleanup timeout when component unmounts or is disabled
  useEffect(() => {
    return () => {
      if (pressTimer.current) {
        clearTimeout(pressTimer.current)
        pressTimer.current = null
      }
    }
  }, []) // Empty dependency array because the handlers themselves are memoized

  return {
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    handleTouchCancel, // Good practice to include this
  }
}
