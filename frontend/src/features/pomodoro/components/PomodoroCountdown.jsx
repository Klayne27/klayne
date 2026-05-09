// features/pomodoro/components/PomodoroCountdown.jsx
import { useState, useEffect, useRef } from "react"

/**
 * @param {number} expectedEndTime  - Unix ms timestamp from the server
 * @param {number} [clockOffset=0]  - server-time offset from useServerTimeOffset
 * @param {string} [className]
 * @param {() => void} [onExpired]  - called once when the countdown reaches 0
 */
const PomodoroCountdown = ({ expectedEndTime, clockOffset = 0, className = "", onExpired }) => {
  const calcRemaining = () =>
    Math.max(0, Math.round((expectedEndTime - (Date.now() + clockOffset)) / 1000))

  const [remaining, setRemaining] = useState(calcRemaining)
  const onExpiredRef = useRef(onExpired)
  useEffect(() => {
    onExpiredRef.current = onExpired
  }, [onExpired])

  useEffect(() => {
    if (!expectedEndTime) return

    const tick = () => {
      const r = calcRemaining()
      setRemaining(r)
      if (r === 0) {
        clearInterval(id)
        onExpiredRef.current?.()
      }
    }

    const id = setInterval(tick, 1_000)
    tick() // run immediately so there's no 1 s delay on mount
    return () => clearInterval(id)
  }, [expectedEndTime, clockOffset])

  const mins = String(Math.floor(remaining / 60)).padStart(2, "0")
  const secs = String(remaining % 60).padStart(2, "0")

  return (
    <span className={`tabular-nums ${className}`}>
      {mins}:{secs}
    </span>
  )
}

export default PomodoroCountdown
