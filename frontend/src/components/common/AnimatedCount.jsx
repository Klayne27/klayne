import { useState, useEffect } from "react"

const AnimatedCount = ({ count, className }) => {
  const [displayCount, setDisplayCount] = useState(count)
  const [previousCount, setPreviousCount] = useState(null)
  const [direction, setDirection] = useState(null)

  useEffect(() => {
    if (count !== displayCount) {
      setPreviousCount(displayCount)
      setDirection(count > displayCount ? "up" : "down")
      setDisplayCount(count)

      const timer = setTimeout(() => {
        setDirection(null)
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [count, displayCount])

  const digitCount = String(displayCount).length
  const widthClass =
    digitCount === 1 ? "w-3" : digitCount === 2 ? "w-4" : digitCount === 3 ? "w-6" : "w-8" 

  return (
    <div className={`relative h-5 overflow-hidden text-left tabular-nums ${widthClass}`}>
      {direction && (
        <>
          <span
            className={`absolute inset-0 ${
              direction === "up" ? "animate-slide-up-old" : "animate-slide-down-old"
            } ${className}`}
          >
            {previousCount}
          </span>
          <span
            className={`absolute inset-0 ${
              direction === "up" ? "animate-slide-up-new" : "animate-slide-down-new"
            } ${className}`}
          >
            {displayCount}
          </span>
        </>
      )}

      {!direction && <span className={className}>{displayCount}</span>}
    </div>
  )
}

export default AnimatedCount
