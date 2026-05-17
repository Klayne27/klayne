// src/features/pomodoro/components/PomodoroBackground.jsx
import { useEffect, useRef, useState } from "react"

/** True for any URL that should be rendered as a looping video. */
export function isVideoUrl(url) {
  if (!url) return false
  return /\.(mp4|webm|mov|ogg)$/i.test(url) || url.includes("/video/upload/")
}

const PomodoroBackground = ({ bgUrl, timerGlow }) => {
  const [displaySrc, setDisplaySrc] = useState(bgUrl ?? null)
  const [isLoaded, setIsLoaded] = useState(false)
  const videoRef = useRef(null)

  useEffect(() => {
    // Don't fade-out the current bg while the new one loads.
    // Only reset isLoaded; keep displaySrc pointing at the old URL
    // until the new asset is ready (for images). Videos swap immediately.
    if (!bgUrl) {
      setDisplaySrc(null)
      setIsLoaded(false)
      return
    }

    if (isVideoUrl(bgUrl)) {
      // Videos: swap src immediately — the browser fetch cache means it
      // starts playing almost instantly if preloaded.
      setDisplaySrc(bgUrl)
      setIsLoaded(true)
    } else {
      // Images: preload off-screen, then swap only when ready.
      setIsLoaded(false)
      const img = new Image()
      img.src = bgUrl
      img.onload = () => {
        setDisplaySrc(bgUrl)
        setIsLoaded(true)
      }
      img.onerror = () => {
        setDisplaySrc(bgUrl) // show anyway, browser will handle the error
        setIsLoaded(true)
      }
      return () => {
        img.onload = null
        img.onerror = null
      }
    }
  }, [bgUrl])

  // Ensure video plays after src swap (autoPlay alone is fragile on mobile)
  useEffect(() => {
    if (videoRef.current && displaySrc && isVideoUrl(displaySrc)) {
      videoRef.current.play().catch(() => {})
    }
  }, [displaySrc])

  if (!displaySrc) return null

  const isVideo = isVideoUrl(displaySrc)

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {isVideo ? (
        <video
          ref={videoRef}
          key={displaySrc}
          src={displaySrc}
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full select-none object-cover"
        />
      ) : (
        <img
          key={displaySrc}
          src={displaySrc}
          alt=""
          role="presentation"
          decoding="async"
          fetchPriority="high"
          className={`h-full w-full select-none object-cover transition-opacity duration-500 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {timerGlow && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 35%, ${timerGlow} 0%, transparent 45%)`,
          }}
        />
      )}
    </div>
  )
}

export default PomodoroBackground
