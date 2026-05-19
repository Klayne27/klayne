import { useRef, useEffect } from "react"
import { useSoundStore } from "../../store/useSoundStore"

export const useSound = (url, volume = 0.2) => {
  const audioRef = useRef(null)
  const soundMuted = useSoundStore.getState().soundMuted

  useEffect(() => {
    audioRef.current = new Audio(url)
    audioRef.current.volume = volume
    // Preload for instant playback
    audioRef.current.load()
  }, [url, volume])

  const play = () => {
    if (soundMuted) return
    if (audioRef.current) {
      audioRef.current.currentTime = 0 // Reset to start for rapid clicks
      audioRef.current.play().catch(() => {
        // Silently catch errors if user hasn't interacted with DOM yet
      })
    }
  }

  return { play }
}
