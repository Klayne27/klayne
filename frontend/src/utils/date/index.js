export const formatPostDate = (createdAt) => {
  const currentDate = new Date()
  const createdAtDate = new Date(createdAt)

  const timeDifferenceInSeconds = Math.floor((currentDate - createdAtDate) / 1000)
  const timeDifferenceInMinutes = Math.floor(timeDifferenceInSeconds / 60)
  const timeDifferenceInHours = Math.floor(timeDifferenceInMinutes / 60)
  const timeDifferenceInDays = Math.floor(timeDifferenceInHours / 24)

  if (timeDifferenceInDays > 1) {
    return createdAtDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  } else if (timeDifferenceInDays === 1) {
    return "1d"
  } else if (timeDifferenceInHours >= 1) {
    return `${timeDifferenceInHours}h`
  } else if (timeDifferenceInMinutes >= 1) {
    return `${timeDifferenceInMinutes}m`
  } else {
    return "Just now"
  }
}

export const formatFullDateTime = (date) => {
  if (!date) return ""

  const d = new Date(date)

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d)
}

export const formatPostDateShort = (date) => {
  const now = new Date()
  const postDate = new Date(date)
  const diffInSeconds = Math.floor((now - postDate) / 1000)

  // Future dates or invalid dates
  if (diffInSeconds < 0) return "just now"

  // Less than 1 minute
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`

  // Less than 1 hour
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`

  // Less than 24 hours
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}hr ago`

  // Less than or equal to 30 days
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays <= 30) return `${diffInDays}d ago`

  // Over 30 days
  return ">30d ago"
}

export const formatMemberSinceDate = (createdAt) => {
  const date = new Date(createdAt)
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  return `Joined ${month} ${year}`
}

export const formatTime = (dateString) => {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  if (date.toDateString() === now.toDateString()) {
    return "Today"
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday"
  } else {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }
}
