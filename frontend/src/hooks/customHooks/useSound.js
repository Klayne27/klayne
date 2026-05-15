import { useRef, useEffect } from "react"

export const useSound = (url, volume = 0.2) => {
  const audioRef = useRef(null)

  useEffect(() => {
    audioRef.current = new Audio(url)
    audioRef.current.volume = volume
    // Preload for instant playback
    audioRef.current.load()
  }, [url, volume])

  const play = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0 // Reset to start for rapid clicks
      audioRef.current.play().catch(() => {
        // Silently catch errors if user hasn't interacted with DOM yet
      })
    }
  }

  return { play }
}
