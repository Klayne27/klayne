import { useEffect, useRef, useState } from "react"

// ── Helpers ──────────────────────────────────────────────────────────────────

/** True for any URL that should be rendered as a looping video. */
export function isVideoUrl(url) {
  if (!url) return false
  return (
    /\.(mp4|webm|mov|ogg)$/i.test(url) || url.includes("/video/upload/") // Cloudinary video path
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
/**
 * Pomodoro page background layer.
 *
 * MUST be rendered as the FIRST child inside a `position: relative` <main>.
 * Uses `position: absolute` (not fixed) so it is contained within <main> and
 * never competes with the layout wrapper's `bg-base-100` stacking context.
 *
 * Props:
 *  bgUrl      – image or video URL (preset path or Cloudinary URL)
 *  timerGlow  – radial-gradient CSS string for the timer-state colour pulse
 */
const PomodoroBackground = ({ bgUrl, timerGlow }) => {
  const [readySrc, setReadySrc] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const videoRef = useRef(null)

  useEffect(() => {
    setIsLoaded(false)
    if (!bgUrl) {
      setReadySrc(null)
      return
    }
    // Defer one animation frame so the critical paint finishes first
    const rafId = requestAnimationFrame(() => setReadySrc(bgUrl))
    return () => cancelAnimationFrame(rafId)
  }, [bgUrl])

  // Ensure the video plays after src is committed (autoPlay alone is fragile)
  useEffect(() => {
    if (videoRef.current && readySrc && isVideoUrl(readySrc)) {
      videoRef.current.play().catch(() => {})
    }
  }, [readySrc])

  if (!readySrc) return null

  const isVideo = isVideoUrl(readySrc)

  return (
    /*
     * `absolute inset-0` – fills the <main> that contains this element.
     * No z-index needed: DOM order places this first, so all subsequent
     * siblings (in normal flow) paint on top automatically.
     */
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {isVideo ? (
        <video
          ref={videoRef}
          key={readySrc}
          src={readySrc}
          autoPlay
          loop
          muted
          playsInline
          onCanPlay={() => setIsLoaded(true)}
          className={`h-full w-full select-none object-cover transition-opacity duration-700 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : (
        <img
          key={readySrc}
          src={readySrc}
          alt=""
          role="presentation"
          decoding="async"
          fetchPriority="low"
          onLoad={() => setIsLoaded(true)}
          className={`h-full w-full select-none object-cover transition-opacity duration-700 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* Dim layer — keeps text readable regardless of image brightness */}
      <div className="absolute inset-0 " />

      {/* Timer-state colour pulse, replicated from the no-background glow */}
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
