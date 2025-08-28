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
        key = format(sessionDate, "MMMMM")
        shouldInclude = true
      }
      if (shouldInclude) {
        if (!groupedData[key]) {
          groupedData[key] = { name: key, time: 0 }
        }
        groupedData[key].time += session.duration
      }
    })

    let dataArray = []
    if (studyView === "weekly") {
      const today = new Date()
      const startOfWeekDate = startOfWeek(today, { weekStartsOn: 1 })
      const allDaysOfWeek = eachDayOfInterval({ start: startOfWeekDate, end: today })
      dataArray = allDaysOfWeek.map((date) => {
        const formattedDayName = format(date, "EEEEEE")
        return {
          name: formattedDayName,
          tooltipName: format(date, "EEEE"),
          time: groupedData[formattedDayName]?.time || 0,
        }
      })
    } else if (studyView === "monthly") {
      const today = new Date()
      const startOfMonthDate = startOfMonth(today)
      const allDaysInMonth = eachDayOfInterval({
        start: startOfMonthDate,
        end: today,
      })

      dataArray = allDaysInMonth.map((date) => {
        const formattedDateName = format(date, "d")
        return {
          name: formattedDateName,
          tooltipName: format(date, "MMM d"),
          time: groupedData[formattedDateName]?.time || 0,
        }
      })
    } else if (studyView === "yearly") {
      const allMonths = eachMonthOfInterval({
        start: startOfYear(new Date()),
        end: new Date(),
      })
      dataArray = allMonths.map((monthDate) => {
        const monthName = format(monthDate, "MMMMM")
        return {
          name: monthName,
          tooltipName: format(monthDate, "MMMM"),
          time: groupedData[monthName]?.time || 0,
        }
      })
    }
    return dataArray
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
        key = format(todoDate, "MMMMM")
        shouldInclude = true
      }

      if (shouldInclude) {
        if (!groupedData[key]) {
          groupedData[key] = { name: key, count: 0 }
        }
        groupedData[key].count += 1
      }
    })

    let dataArray = []
    if (todoView === "weekly") {
      const today = new Date()
      const startOfWeekDate = startOfWeek(today, { weekStartsOn: 1 })
      const allDaysOfWeek = eachDayOfInterval({ start: startOfWeekDate, end: today })
      dataArray = allDaysOfWeek.map((date) => {
        const formattedDayName = format(date, "EEEEEE")
        return {
          name: formattedDayName,
          tooltipName: format(date, "EEEE"),
          count: groupedData[formattedDayName]?.count || 0,
        }
      })
    } else if (todoView === "monthly") {
      const today = new Date()
      const startOfMonthDate = startOfMonth(today)
      const allDaysInMonth = eachDayOfInterval({
        start: startOfMonthDate,
        end: today,
      })
      dataArray = allDaysInMonth.map((date) => {
        const formattedDateName = format(date, "d")
        return {
          name: formattedDateName,
          tooltipName: format(date, "MMM d"),
          count: groupedData[formattedDateName]?.count || 0,
        }
      })
    } else if (todoView === "yearly") {
      const allMonths = eachMonthOfInterval({
        start: startOfYear(new Date()),
        end: new Date(),
      })
      dataArray = allMonths.map((monthDate) => {
        const monthName = format(monthDate, "MMMMM")
        return {
          name: monthName,
          tooltipName: format(monthDate, "MMMM"),
          count: groupedData[monthName]?.count || 0,
        }
      })
    }

    return dataArray
  }, [completedTodos, todoView])

  const studyDurationToday = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd")
    const totalToday = allSessions
      ?.filter((session) => format(new Date(session.date), "yyyy-MM-dd") === today)
      .reduce((sum, session) => sum + session.duration, 0)
    return totalToday || 0
  }, [allSessions])

  const studyDurationWeekly = useMemo(() => {
    if (!allSessions) return 0
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    const totalWeekly = allSessions
      ?.filter((session) => new Date(session.date) >= weekStart)
      .reduce((sum, session) => sum + session.duration, 0)
    return totalWeekly || 0
  }, [allSessions])

  const currentStudyDuration = studyGoalView === "daily" ? studyDurationToday : studyDurationWeekly
  const currentStudyGoal = studyGoalView === "daily" ? dailyGoalHours : weeklyGoalHours

  const studyGoalProgress = useMemo(() => {
    if (currentStudyGoal <= 0) return 0
    const goalInMinutes = currentStudyGoal * 60
    return Math.min((currentStudyDuration / goalInMinutes) * 100, 100)
  }, [currentStudyDuration, currentStudyGoal])

  const todoCounts = useMemo(() => {
    if (!completedTodos) return { daily: 0, weekly: 0 }
    const today = format(new Date(), "yyyy-MM-dd")
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })

    const completedDaily = completedTodos.filter(
      (todo) => format(new Date(todo.completedAt), "yyyy-MM-dd") === today,
    ).length

    const completedWeekly = completedTodos.filter(
      (todo) => new Date(todo.completedAt) >= weekStart,
    ).length

    return { daily: completedDaily, weekly: completedWeekly }
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
