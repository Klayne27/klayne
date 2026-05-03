import { useMemo } from "react"
import {
  isThisWeek,
  isThisMonth,
  isThisYear,
  format,
  startOfWeek,
  startOfMonth,
  eachMonthOfInterval,
  startOfYear,
  eachDayOfInterval,
} from "date-fns"

export const useDashboardData = ({
  allSessions,
  completedTodos,
  studyView,
  todoView,
  studyGoalView,
  todoGoalView,
  dailyGoalHours,
  weeklyGoalHours,
  dailyTodoGoal,
  weeklyTodoGoal,
}) => {
  const chartData = useMemo(() => {
    if (!allSessions) return []
    const groupedData = {}

    allSessions.forEach((session) => {
      const sessionDate = new Date(session.date)
      let key
      let shouldInclude = false

      if (studyView === "weekly" && isThisWeek(sessionDate, { weekStartsOn: 1 })) {
        key = format(sessionDate, "EEEEEE")
        shouldInclude = true
      } else if (studyView === "monthly" && isThisMonth(sessionDate)) {
        key = format(sessionDate, "d")
        shouldInclude = true
      } else if (studyView === "yearly" && isThisYear(sessionDate)) {
        key = format(sessionDate, "yyyy-MM")
        shouldInclude = true
      }

      if (shouldInclude) {
        if (!groupedData[key]) groupedData[key] = { time: 0 }
        groupedData[key].time += session.duration
      }
    })

    if (studyView === "weekly") {
      const today = new Date()
      const startOfWeekDate = startOfWeek(today, { weekStartsOn: 1 })
      return eachDayOfInterval({ start: startOfWeekDate, end: today }).map((date) => {
        const key = format(date, "EEEEEE")
        return {
          name: key, // XAxis dataKey — unique per day of week
          tooltipName: format(date, "EEEE"),
          time: groupedData[key]?.time || 0,
        }
      })
    }

    if (studyView === "monthly") {
      const today = new Date()
      return eachDayOfInterval({ start: startOfMonth(today), end: today }).map((date) => {
        const key = format(date, "d")
        return {
          name: key, // day number — unique within a month
          tooltipName: format(date, "MMM d"),
          time: groupedData[key]?.time || 0,
        }
      })
    }

    if (studyView === "yearly") {
      return eachMonthOfInterval({ start: startOfYear(new Date()), end: new Date() }).map(
        (monthDate) => {
          const groupKey = format(monthDate, "yyyy-MM")
          return {
            // Use the full month name as `name` so recharts has a unique key
            // per data point. The XAxis is hidden for yearly view so this
            // never renders as a label — it only identifies the point internally.
            name: format(monthDate, "MMMM"),
            // Single-letter abbreviation kept for display if ever needed
            shortName: format(monthDate, "MMMMM"),
            tooltipName: format(monthDate, "MMMM"),
            time: groupedData[groupKey]?.time || 0,
          }
        },
      )
    }

    return []
  }, [allSessions, studyView])

  const todoChartData = useMemo(() => {
    if (!completedTodos) return []
    const groupedData = {}

    completedTodos.forEach((todo) => {
      const todoDate = new Date(todo.completedAt)
      let key
      let shouldInclude = false

      if (todoView === "weekly" && isThisWeek(todoDate, { weekStartsOn: 1 })) {
        key = format(todoDate, "EEEEEE")
        shouldInclude = true
      } else if (todoView === "monthly" && isThisMonth(todoDate)) {
        key = format(todoDate, "d")
        shouldInclude = true
      } else if (todoView === "yearly" && isThisYear(todoDate)) {
        key = format(todoDate, "yyyy-MM")
        shouldInclude = true
      }

      if (shouldInclude) {
        if (!groupedData[key]) groupedData[key] = { count: 0 }
        groupedData[key].count += 1
      }
    })

    if (todoView === "weekly") {
      const today = new Date()
      const startOfWeekDate = startOfWeek(today, { weekStartsOn: 1 })
      return eachDayOfInterval({ start: startOfWeekDate, end: today }).map((date) => {
        const key = format(date, "EEEEEE")
        return {
          name: key,
          tooltipName: format(date, "EEEE"),
          count: groupedData[key]?.count || 0,
        }
      })
    }

    if (todoView === "monthly") {
      const today = new Date()
      return eachDayOfInterval({ start: startOfMonth(today), end: today }).map((date) => {
        const key = format(date, "d")
        return {
          name: key,
          tooltipName: format(date, "MMM d"),
          count: groupedData[key]?.count || 0,
        }
      })
    }

    if (todoView === "yearly") {
      return eachMonthOfInterval({ start: startOfYear(new Date()), end: new Date() }).map(
        (monthDate) => {
          const groupKey = format(monthDate, "yyyy-MM")
          return {
            name: format(monthDate, "MMMM"), // unique full name as recharts key
            shortName: format(monthDate, "MMMMM"),
            tooltipName: format(monthDate, "MMMM"),
            count: groupedData[groupKey]?.count || 0,
          }
        },
      )
    }

    return []
  }, [completedTodos, todoView])

  // ── Goal calculations (unchanged) ─────────────────────────────────────────

  const studyDurationToday = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd")
    return (
      allSessions
        ?.filter((s) => format(new Date(s.date), "yyyy-MM-dd") === today)
        .reduce((sum, s) => sum + s.duration, 0) || 0
    )
  }, [allSessions])

  const studyDurationWeekly = useMemo(() => {
    if (!allSessions) return 0
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    return (
      allSessions
        ?.filter((s) => new Date(s.date) >= weekStart)
        .reduce((sum, s) => sum + s.duration, 0) || 0
    )
  }, [allSessions])

  const currentStudyDuration = studyGoalView === "daily" ? studyDurationToday : studyDurationWeekly
  const currentStudyGoal = studyGoalView === "daily" ? dailyGoalHours : weeklyGoalHours

  const studyGoalProgress = useMemo(() => {
    if (currentStudyGoal <= 0) return 0
    return Math.min((currentStudyDuration / (currentStudyGoal * 60)) * 100, 100)
  }, [currentStudyDuration, currentStudyGoal])

  const todoCounts = useMemo(() => {
    if (!completedTodos) return { daily: 0, weekly: 0 }
    const today = format(new Date(), "yyyy-MM-dd")
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    return {
      daily: completedTodos.filter((t) => format(new Date(t.completedAt), "yyyy-MM-dd") === today)
        .length,
      weekly: completedTodos.filter((t) => new Date(t.completedAt) >= weekStart).length,
    }
  }, [completedTodos])

  const currentTodoCount = todoGoalView === "daily" ? todoCounts.daily : todoCounts.weekly
  const currentTodoGoal = todoGoalView === "daily" ? dailyTodoGoal : weeklyTodoGoal

  const todoGoalProgress = useMemo(() => {
    if (currentTodoGoal <= 0) return 0
    return Math.min((currentTodoCount / currentTodoGoal) * 100, 100)
  }, [currentTodoCount, currentTodoGoal])

  return {
    chartData,
    todoChartData,
    studyGoalProgress,
    todoGoalProgress,
    currentStudyDuration,
    currentStudyGoal,
    currentTodoCount,
    currentTodoGoal,
  }
}
