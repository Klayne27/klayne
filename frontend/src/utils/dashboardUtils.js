export const getTitle = (goalType) => {
  if (goalType === "study") return "Set Daily Study Goal"
  if (goalType === "weekly_study") return "Set Weekly Study Goal"
  if (goalType === "daily_todo") return "Set Daily Task Goal"
  if (goalType === "weekly_todo") return "Set Weekly Task Goal"
  return "Set Goal"
}

export const getLabel = (goalType) => {
  if (goalType === "study" || goalType === "weekly_study") return "hours"
  return "tasks"
}

export const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

// Function to get the value of a CSS variable
export const getCssVar = (variable) => {
  if (typeof document !== "undefined") {
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
  }
  return null
}

export const formatShortDuration = (minutes) => {
  if (isNaN(minutes) || minutes < 0) return "0m"
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours >= 1000) {
    return `${hours}h`
  }
  if (hours < 1000) {
    return `${hours}h ${remainingMinutes}m`
  }

  return `${remainingMinutes}m`
}