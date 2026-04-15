import { useEffect } from "react"
import { useAuthUser } from "../auth/authHooks/useAuthUser"
import { WARDROBE_CONFIG } from "./wardrobeConfig"

const StyleWrapper = () => {
  const { authUser } = useAuthUser()
  const equipped = authUser?.equipped || {}

  useEffect(() => {
    const root = document.documentElement

    // Clear managed vars
    root.style.removeProperty("--user-font")

    // Apply font
    if (equipped.font) {
      const config = WARDROBE_CONFIG[equipped.font]
      if (config?.cssVars) {
        Object.entries(config.cssVars).forEach(([k, v]) => root.style.setProperty(k, v))
      }
    }
  }, [equipped.font])

  return null
}

export default StyleWrapper
