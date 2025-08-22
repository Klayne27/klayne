import { FaCheckCircle, FaUserFriends } from "react-icons/fa"
import {
  FaBook,
  FaDna,
  FaDumbbell,
  FaHammer,
  FaLightbulb,
  FaPaintbrush,
  FaPen,
  FaStar,
} from "react-icons/fa6"
import { ImBlocked } from "react-icons/im"
import { PiMathOperationsFill } from "react-icons/pi"

export const getPriorityColor = (priority) => {
  switch (priority) {
    case "urgent":
      return "border-red-400 bg-red-500/30 rounded-full"
    case "high":
      return "border-orange-400 bg-orange-500/30 rounded-full"
    case "medium":
      return "border-yellow-400 bg-yellow-500/30 rounded-full"
    case "low":
      return "rounded-full border-slate-400"
    default:
      return
  }
}

export const calculateXpGainForTodo = (todo, todoList) => {
  const xpRewards = {
    low: 25,
    medium: 50,
    high: 100,
    urgent: 200,
  }

  let xpToAdd = xpRewards[todo.priority] || 25

  if (todoList && todoList.isPublic) {
    xpToAdd *= 2
  }

  return xpToAdd
}

export const getCompletedColor = (priority) => {
  switch (priority) {
    case "urgent":
      return "text-red-400 border-red-500 border"
    case "high":
      return "text-orange-400"
    case "medium":
      return "text-yellow-400"
    case "low":
      return "text-slate-400 border-2"
    default:
      return
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
      return "text-slate-400"
    default:
      return
  }
}

export const iconOptions = [
  { name: "None", icon: <ImBlocked /> },
  { name: "FaPen", icon: <FaPen /> },
  { name: "FaCheckCircle", icon: <FaCheckCircle /> },
  { name: "FaStar", icon: <FaStar /> },
  { name: "FaBook", icon: <FaBook /> },
  { name: "FaDumbbell", icon: <FaDumbbell /> },
  { name: "FaLightbulb", icon: <FaLightbulb /> },
  { name: "FaPaintBrush", icon: <FaPaintbrush /> },
  { name: "FaUserFriends", icon: <FaUserFriends /> },
  { name: "FaHammer", icon: <FaHammer /> },
  { name: "FaDna", icon: <FaDna /> },
  { name: "PiMathOperationsFill", icon: <PiMathOperationsFill /> },
]

export const colorOptions = [
  "red",
  "orange",
  "amber",
  "lime",
  "emerald",
  "teal",
  "cyan",
  "blue",
  "indigo",
  "violet",
  "fuchsia",
  "pink",
  "rose",
  "yellow",
  "stone",
  "slate",
]

export const colorMap = {
  red: "text-red-400",
  orange: "text-orange-400",
  amber: "text-amber-400",
  lime: "text-lime-400",
  emerald: "text-emerald-400",
  teal: "text-teal-400",
  cyan: "text-cyan-400",
  blue: "text-blue-400",
  indigo: "text-indigo-500",
  violet: "text-violet-400",
  fuchsia: "text-fuchsia-400",
  pink: "text-pink-400",
  rose: "text-rose-500",
  yellow: "text-yellow-800",
  stone: "text-stone-400",
  slate: "text-slate-400",
}

export const bgColorMap = {
  red: "bg-red-400",
  orange: "bg-orange-400",
  amber: "bg-amber-400",
  lime: "bg-lime-400",
  emerald: "bg-emerald-400",
  teal: "bg-teal-400",
  cyan: "bg-cyan-400",
  blue: "bg-blue-400",
  indigo: "bg-indigo-500",
  violet: "bg-violet-400",
  fuchsia: "bg-fuchsia-400",
  pink: "bg-pink-400",
  rose: "bg-rose-500",
  yellow: "bg-yellow-800",
  stone: "bg-stone-400",
  slate: "bg-slate-400",
}

export const iconMap = {
  FaPen: FaPen,
  FaCheckCircle: FaCheckCircle,
  FaStar: FaStar,
  FaBook: FaBook,
  FaDumbbell: FaDumbbell,
  FaLightbulb: FaLightbulb,
  FaPaintBrush: FaPaintbrush,
  FaUserFriends: FaUserFriends,
  FaHammer: FaHammer,
  FaDna: FaDna,
  PiMathOperationsFill: PiMathOperationsFill,
}

export const findTodoAndParent = (todoLists, todoId) => {
  if (!todoLists?.pages) return null

  for (const page of todoLists.pages) {
    if (!page.data) continue

    for (const todoList of page.data) {
      const todo = todoList.todos.find((t) => t._id === todoId)
      if (todo) {
        return { todoToComplete: todo, parentList: todoList }
      }
    }
  }
  return null
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
    (a, b) =>
      new Date(b.todos[0].completedAt || b.todos[0].createdAt) -
      new Date(a.todos[0].completedAt || a.todos[0].createdAt),
  )
}
