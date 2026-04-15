import { useEffect } from "react"
import { useAuthUser } from "../auth/authHooks/useAuthUser"
import { WARDROBE_CONFIG } from "./wardrobeConfig"

/**
 * Reads equipped items from the cached authUser and applies CSS variables
 * to :root. Does NOT render any DOM — purely a side-effect component.
 * Place once, high in the tree (inside AuthenticatedLayout).
 */
const StyleWrapper = () => {
  const { authUser } = useAuthUser()
  const equipped = authUser?.equipped || {}

  useEffect(() => {
    const root = document.documentElement

    // Clear all user-controlled vars first
    root.style.removeProperty("--user-font")
    root.style.removeProperty("--user-bg-gradient")
    root.style.removeProperty("--user-bg-animate")
    root.classList.remove("theme-cyber-study")

    // Apply font
    if (equipped.font) {
      const config = WARDROBE_CONFIG[equipped.font]
      if (config?.cssVars) {
        Object.entries(config.cssVars).forEach(([k, v]) => root.style.setProperty(k, v))
      }
    }

    // Apply theme
    if (equipped.theme) {
      const config = WARDROBE_CONFIG[equipped.theme]
      if (config?.cssVars) {
        Object.entries(config.cssVars).forEach(([k, v]) => root.style.setProperty(k, v))
      }
      if (config?.bodyClass) {
        root.classList.add(config.bodyClass)
      }
    }
  }, [equipped.font, equipped.theme])

  return null
}

export default StyleWrapper
