export const getPriorityColor = (priority) => {
  switch (priority) {
    case "urgent":
      return "border-red-400 bg-red-500/30 rounded-full border"
    case "high":
      return "border-orange-400 bg-orange-500/30 rounded-full border"
    case "medium":
      return "border-yellow-400 bg-yellow-500/30 rounded-full border"
    case "low":
    default:
      return "rounded-full border border-slate-400"
  }
}

export const getCompletedColor = (priority) => {
  switch (priority) {
    case "urgent":
      return "text-red-400"
    case "high":
      return "text-orange-400"
    case "medium":
      return "text-yellow-400"
    case "low":
    default:
      return "text-slate-400"
  }
}

export const getBadgeColor = (action) => {
  switch (action) {
    case "created_todo":
      return "bg-yellow-500"
    case "completed_todo":
      return "bg-green-500"
    case "updated_todo":
      return "bg-blue-500"
    case "deleted_todo":
      return "bg-gray-500"
    default:
      break
  }
}

export const getTextColor = (priority) => {
  switch (priority) {
    case "urgent":
      return "text-red-400"
    case "high":
      return "text-orange-400"
    case "medium":
      return "text-yellow-400"
    case "low":
    default:
      return "text-slate-400"
  }
}

// Add this new function inside CompletedTodoList.jsx before the component
export const groupTodosByDate = (todos) => {
  const groups = {}
  const today = new Date()

  // Set the time to midnight for accurate day comparison
  today.setHours(0, 0, 0, 0)

  const formatDate = (date) => {
    const options = { month: "short", day: "numeric" }
    return date.toLocaleDateString("en-US", options)
  }

  const getDayLabel = (date) => {
    // Also set the completed date to midnight for comparison
    const completedDate = new Date(date)
    completedDate.setHours(0, 0, 0, 0)

    const diffInMilliseconds = today.getTime() - completedDate.getTime()
    const diffInDays = diffInMilliseconds / (1000 * 60 * 60 * 24)

    // Round to the nearest integer to handle minor time differences
    if (Math.round(diffInDays) === 0) return "Today"
    if (Math.round(diffInDays) === 1) return "Yesterday"

    const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" })
    return `${formatDate(date)} • ${dayOfWeek}`
  }

  todos.forEach((todo) => {
    const completedAtDate = new Date(todo.completedAt || todo.createdAt)
    const dateKey = completedAtDate.toDateString() // e.g., "Wed Aug 20 2025"
    const displayLabel = getDayLabel(completedAtDate)

    if (!groups[dateKey]) {
      groups[dateKey] = {
        label: displayLabel,
        todos: [],
      }
    }
    groups[dateKey].todos.push(todo)
  })

  // Convert object to array and sort by date descending
  return Object.values(groups).sort(
    (a, b) => new Date(b.todos[0].completedAt || b.todos[0].createdAt) - new Date(a.todos[0].completedAt || a.todos[0].createdAt),
  )
}
