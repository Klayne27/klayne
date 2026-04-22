// import { useEffect } from "react"
// import { WARDROBE_CONFIG } from "../../features/wardrobe/wardrobeConfig"
// import { loadGoogleFont } from "../../features/wardrobe/StyleWrapper"

// const UserFullName = ({ user, className, style, ...props }) => {
//   const fontKey = user?.equipped?.font
//   const config = fontKey ? WARDROBE_CONFIG[fontKey] : null
//   const fontFamily = config?.cssVars?.["--user-font"] ?? null

//   useEffect(() => {
//     if (config?.googleFont) loadGoogleFont(config.googleFont)
//   }, [config?.googleFont])

//   return (
//     <span className={className} style={fontFamily ? { ...style, fontFamily } : style} {...props}>
//       {user?.fullName || "Unknown User"}
//     </span>
//   )
// }

// export default UserFullName

import { useEffect } from "react"
import { WARDROBE_CONFIG } from "../../features/wardrobe/wardrobeConfig"
import { loadGoogleFont } from "../../features/wardrobe/StyleWrapper"

const UserFullName = ({ user, isAnon, className, style, ...props }) => {
  // If anonymous, we don't look at equipped items at all
  const fontKey = !isAnon ? user?.equipped?.font : null
  const config = fontKey ? WARDROBE_CONFIG[fontKey] : null
  const fontFamily = config?.cssVars?.["--user-font"] ?? null

  // Ensure the custom font only loads if NOT anonymous
  useEffect(() => {
    if (!isAnon && config?.googleFont) {
      loadGoogleFont(config.googleFont)
    }
  }, [config?.googleFont, isAnon])

  // Handle color: clear it if anon, otherwise use user's custom color
  const finalStyle = { ...style }
  if (isAnon) {
    finalStyle.fontFamily = "inherit"
    finalStyle.color = "inherit" // or a specific "anon" color
  } else {
    if (fontFamily) finalStyle.fontFamily = fontFamily
    if (user?.nameColor) finalStyle.color = user.nameColor
  }

  return (
    <span className={`pl-[2px] ${className}`} style={finalStyle} {...props}>
      {isAnon ? "Anonymous" : user?.fullName || "Unknown User"}
    </span>
  )
}

export default UserFullName