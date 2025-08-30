export const truncateText = (text, maxLength = 30) => {
  if (!text) return ""
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + "..."
}

export const getDisplayUsername = (username, isMobile) => {
  if (isMobile && username.length > 4) {
    return username.slice(0, 4) + "..."
  }
  return username
}