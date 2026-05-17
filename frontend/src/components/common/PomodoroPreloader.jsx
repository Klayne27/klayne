// src/components/PomodoroPreloader.jsx
import { useEffect } from "react"
import { POMODORO_PRESETS } from "../constants/pomodoroPresets" // Adjust path if needed

const PomodoroPreloader = () => {
  useEffect(() => {
    if (!POMODORO_PRESETS) return

    // Delay the preloading so it doesn't block the initial React rendering
    const timer = setTimeout(() => {
      POMODORO_PRESETS.forEach((preset) => {
        // Note: Change 'preset.url' to whatever property holds your actual file path in your constants file
        const url = preset.url || preset.videoUrl || preset.src

        if (!url) return

        if (/\.(mp4|webm|mov|ogg)$/i.test(url)) {
          // Preload video files
          const video = document.createElement("video")
          video.src = url
          video.preload = "auto"
        } else {
          // Preload image files
          const img = new Image()
          img.src = url
        }
      })
    }, 2500)

    return () => clearTimeout(timer)
  }, [])

  return null // Render absolutely nothing
}

export default PomodoroPreloader
