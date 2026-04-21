import { useEffect } from "react"
import { WARDROBE_CONFIG } from "../../features/wardrobe/wardrobeConfig"
import { loadGoogleFont } from "../../features/wardrobe/StyleWrapper"

const UserFullName = ({ user, className, style, ...props }) => {
  const fontKey = user?.equipped?.font
  const config = fontKey ? WARDROBE_CONFIG[fontKey] : null
  const fontFamily = config?.cssVars?.["--user-font"] ?? null

  useEffect(() => {
    if (config?.googleFont) loadGoogleFont(config.googleFont)
  }, [config?.googleFont])

  return (
    <span className={className} style={fontFamily ? { ...style, fontFamily } : style} {...props}>
      {user?.fullName}
    </span>
  )
}

export default UserFullName
