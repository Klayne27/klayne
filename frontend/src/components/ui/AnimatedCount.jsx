// components/AnimatedCount.jsx
import { useState, useEffect } from "react"

const AnimatedCount = ({ count, className }) => {
  const [displayCount, setDisplayCount] = useState(count)
  const [previousCount, setPreviousCount] = useState(null)
  const [direction, setDirection] = useState(null) // 'up', 'down', or null

  useEffect(() => {
    // This effect runs whenever the 'count' from props changes
    if (count !== displayCount) {
      // Set the number that will slide OUT
      setPreviousCount(displayCount)
      // Determine the direction for the animation
      setDirection(count > displayCount ? "up" : "down")
      // Set the new number that will slide IN
      setDisplayCount(count)

      // After the animation duration, reset the direction.
      // This removes the animation elements and leaves only the final count.
      const timer = setTimeout(() => {
        setDirection(null)
      }, 300) // This must match your animation duration in tailwind.config.js

      return () => clearTimeout(timer)
    }
  }, [count, displayCount])

  return (
    <div
      // This container clips the animation and holds the numbers
      className={`relative h-5 w-2 overflow-hidden text-left tabular-nums`}
    >

      {direction && (
        <>
          <span
            className={`absolute inset-0 ${
              direction === "up" ? "animate-slide-up-old" : "animate-slide-down-old"
            } ${className}`} // Pass down color class
          >
            {previousCount}
          </span>
          <span
            className={`absolute inset-0 ${
              direction === "up" ? "animate-slide-up-new" : "animate-slide-down-new"
            } ${className}`} // Pass down color class
          >
            {displayCount}
          </span>
        </>
      )}

      {/* This block renders only when there is NO animation.
        It shows the stable, final count.
      */}
      {!direction && <span className={className}>{displayCount}</span>}
    </div>
  )
}

export default AnimatedCount
