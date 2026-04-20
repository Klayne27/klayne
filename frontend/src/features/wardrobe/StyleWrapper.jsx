import { useEffect } from "react"
import { useAuthUser } from "../auth/authHooks/useAuthUser"
import { WARDROBE_CONFIG } from "./wardrobeConfig"

const loadedFonts = new Set()

export const loadGoogleFont = (googleFont) => {
  if (!googleFont || loadedFonts.has(googleFont)) return
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = `https://fonts.googleapis.com/css2?family=${googleFont}&display=swap`
  document.head.appendChild(link)
  loadedFonts.add(googleFont)
}

const StyleWrapper = () => {
  const { authUser } = useAuthUser()
  const equipped = authUser?.equipped || {}

  useEffect(() => {
    const root = document.documentElement
    root.style.removeProperty("--user-font")

    if (equipped.font) {
      const config = WARDROBE_CONFIG[equipped.font]
      if (config?.googleFont) loadGoogleFont(config.googleFont)
      if (config?.cssVars) {
        Object.entries(config.cssVars).forEach(([k, v]) => root.style.setProperty(k, v))
      }
    }
  }, [equipped.font])

  return null
}

export default StyleWrapper
