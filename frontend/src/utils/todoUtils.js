
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
      return "border-slate-400 rounded-full border"
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

