// src/features/pomodoro/components/PomodoroBackground.jsx
import { useEffect, useRef, useState } from "react"

export function isVideoUrl(url) {
  if (!url) return false
  return /\.(mp4|webm|mov|ogg)$/i.test(url) || url.includes("/video/upload/")
}

const FADE_MS = 300

const PomodoroBackground = ({ bgUrl, timerGlow }) => {
  const [activeSrc, setActiveSrc] = useState(bgUrl ?? null)
  const [visible, setVisible] = useState(true) // controls the media opacity
  const [blackout, setBlackout] = useState(false) // black overlay opacity
  const videoRef = useRef(null)
  const swapTimer = useRef(null)
  const prevUrl = useRef(bgUrl)

  useEffect(() => {
    if (videoRef.current && activeSrc && isVideoUrl(activeSrc)) {
      videoRef.current.play().catch(() => {})
    }
  }, [activeSrc])

  useEffect(() => {
    clearTimeout(swapTimer.current)

    // No change
    if (bgUrl === prevUrl.current && activeSrc === bgUrl) return
    prevUrl.current = bgUrl

    if (!bgUrl) {
      // Just fade out and clear
      setVisible(false)
      swapTimer.current = setTimeout(() => {
        setActiveSrc(null)
      }, FADE_MS)
      return
    }

    // 1. Fade black overlay IN (covers the current background)
    setBlackout(true)

    swapTimer.current = setTimeout(() => {
      // 2. Swap the src while hidden behind the black overlay
      setActiveSrc(bgUrl)
      setVisible(true)

      // 3. Fade black overlay OUT, revealing the new background
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setBlackout(false)
        })
      })
    }, FADE_MS)

    return () => clearTimeout(swapTimer.current)
  }, [bgUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(swapTimer.current), [])

  if (!activeSrc && !blackout) return null

  const isVideo = activeSrc ? isVideoUrl(activeSrc) : false

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* The actual background media */}
      {activeSrc &&
        (isVideo ? (
          <video
            ref={videoRef}
            key={activeSrc}
            src={activeSrc}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full select-none object-cover"
            style={{ opacity: visible ? 1 : 0, transition: `opacity ${FADE_MS}ms ease-in-out` }}
          />
        ) : (
          <img
            key={activeSrc}
            src={activeSrc}
            alt=""
            role="presentation"
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full select-none object-cover"
            style={{ opacity: visible ? 1 : 0, transition: `opacity ${FADE_MS}ms ease-in-out` }}
          />
        ))}

      {/* Black overlay — fades in to cover swap, then fades out */}
      <div
        className="absolute inset-0 bg-black"
        style={{
          opacity: blackout ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease-in-out`,
          pointerEvents: "none",
        }}
      />

      {/* Timer glow on top */}
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
