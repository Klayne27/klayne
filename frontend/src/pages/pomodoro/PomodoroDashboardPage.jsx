import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  FaCog,
  FaPlus,
  FaCheckCircle,
  FaStar,
  FaHourglassHalf,
  FaTachometerAlt,
  FaTasks,
  FaFire,
} from "react-icons/fa"
import { CircularProgressbar, buildStyles } from "react-circular-progressbar"
import "react-circular-progressbar/dist/styles.css"
import {
  XAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  YAxis,
  LineChart,
  Line,
  LabelList,
} from "recharts"
import {
  isThisWeek,
  isThisMonth,
  isThisYear,
  format,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from "date-fns"

import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import { Link, useNavigate } from "react-router-dom"
import { useGetCompletedTodosCount } from "../../features/todos/todoHooks/useGetCompletedTodosCount"
import { useGetActiveTodosCount } from "../../features/todos/todoHooks/useGetActiveTodosCount"
import BadgeDisplay from "../../components/common/BadgeDisplay"
import { FaArrowLeft, FaEllipsis, FaPen } from "react-icons/fa6"
import { BsListTask } from "react-icons/bs"
import { GrTask } from "react-icons/gr"
import { TbList, TbListCheck } from "react-icons/tb"
import { useGetCompletedTodosHistory } from "../../features/todos/todoHooks/useGetCompletedTodosHistory"
import { useGoalStore } from "../../store/useGoalStore"
import { LuList, LuListTodo } from "react-icons/lu"
import { IoIosTimer } from "react-icons/io"
import { GoHome } from "react-icons/go"

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

// Function to get the value of a CSS variable
const getCssVar = (variable) => {
  if (typeof document !== "undefined") {
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
  }
  return null
}

const formatShortDuration = (minutes) => {
  if (isNaN(minutes) || minutes < 0) return "0m"
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if(hours >= 1000) {
    return `${hours}h`
  }
  if (hours < 1000) {
    return `${hours}h ${remainingMinutes}m`
  }

  return `${remainingMinutes}m`
}

const BentoCard = ({ children, className }) => (
  <div
    className={`rounded-xl border border-accent bg-base-200 p-5 shadow-inner backdrop-blur-sm ${className}`}
  >
    {children}
  </div>
)

const StatItem = ({ label, value, colorClass, icon }) => (
  <div className="flex items-center space-x-3">
    <div className={`rounded-full p-2 ${colorClass}`}>{icon}</div>
    <div className="flex flex-col">
      <span className="text-lg font-bold text-base-content-inverse">{value}</span>
      <span className="text-xs text-neutral-400">{label}</span>
    </div>
  </div>
)

const fetchAllSessions = async () => {
  const res = await fetch("/api/study/history")
  if (!res.ok) throw new Error("Failed to fetch study history")
  return res.json()
}

// Hook to fetch completed todos with their completion dates
const useGetCompletedTodosWithDates = () => {
  return useQuery({
    queryKey: ["completedTodosWithDates"],
    queryFn: async () => {
      const res = await fetch("/api/todos/completed-goal")
      if (!res.ok) throw new Error("Failed to fetch completed todos")
      return res.json()
    },
  })
}

const StudyDashboardPage = () => {
  const { authUser } = useAuthUser()
  const [studyView, setStudyView] = useState("weekly")
  const [todoView, setTodoView] = useState("weekly")
  const [todoGoalView, setTodoGoalView] = useState("daily")
  const [studyGoalView, setStudyGoalView] = useState("daily")
  const [openProfileDropdown, setOpenProfileDropdown] = useState(false)

  const baseContentInverseColor = getCssVar("--text-on-base-color")

  const { dailyGoalHours, dailyTodoGoal, weeklyTodoGoal, weeklyGoalHours } = useGoalStore()

  const navigate = useNavigate()

  const { data: allSessions, isLoading: allSessionsLoading } = useQuery({
    queryKey: ["studyHistory"],
    queryFn: fetchAllSessions,
  })

  const { data: completedTodos, isLoading: completedTodosLoading } = useGetCompletedTodosWithDates()

  const { completedTodosCount } = useGetCompletedTodosCount()
  const { activeTodosCount } = useGetActiveTodosCount()

  const longestStudyStreak = authUser?.longestStudyStreak || 0

  const chartData = useMemo(() => {
    if (!allSessions) return []
    const groupedData = {}
    allSessions.forEach((session) => {
      const sessionDate = new Date(session.date)
      let key
      let shouldInclude = false
      if (studyView === "weekly" && isThisWeek(sessionDate, { weekStartsOn: 1 })) {
        key = format(sessionDate, "EEE")
        shouldInclude = true
      } else if (studyView === "monthly" && isThisMonth(sessionDate)) {
        key = format(sessionDate, "MMM d")
        shouldInclude = true
      } else if (studyView === "yearly" && isThisYear(sessionDate)) {
        key = format(sessionDate, "MMMM")
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
      const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      dataArray = daysOfWeek.map((day) => ({
        name: day,
        time: groupedData[day]?.time || 0,
      }))
    } else if (studyView === "monthly") {
      const today = new Date()
      const startOfMonthDate = startOfMonth(today)
      const endOfMonthDate = endOfMonth(today)
      const allDaysInMonth = eachDayOfInterval({
        start: startOfMonthDate,
        end: endOfMonthDate,
      })

      // Map over the ordered array of all days in the month
      dataArray = allDaysInMonth.map((date) => {
        const formattedDate = format(date, "MMM d")
        return {
          name: formattedDate,
          time: groupedData[formattedDate]?.time || 0,
        }
      })
    } else if (studyView === "yearly") {
      const monthNames = [
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
      dataArray = monthNames.map((month) => ({
        name: month,
        time: groupedData[month]?.time || 0,
      }))
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
        key = format(todoDate, "EEE")
        shouldInclude = true
      } else if (todoView === "monthly" && isThisMonth(todoDate)) {
        // Use "MMM d" for a short, readable month/day format
        key = format(todoDate, "MMM d")
        shouldInclude = true
      } else if (todoView === "yearly" && isThisYear(todoDate)) {
        key = format(todoDate, "MMMM")
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
      const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      dataArray = daysOfWeek.map((day) => ({
        name: day,
        count: groupedData[day]?.count || 0,
      }))
    } else if (todoView === "monthly") {
      const today = new Date()
      const startOfMonthDate = startOfMonth(today)
      const endOfMonthDate = endOfMonth(today)
      const allDaysInMonth = eachDayOfInterval({
        start: startOfMonthDate,
        end: endOfMonthDate,
      })

      // Map over the ordered array of all days in the month
      dataArray = allDaysInMonth.map((date) => {
        const formattedDate = format(date, "MMM d")
        return {
          name: formattedDate,
          count: groupedData[formattedDate]?.count || 0,
        }
      })
    } else if (todoView === "yearly") {
      const monthNames = [
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
      dataArray = monthNames.map((month) => ({
        name: month,
        count: groupedData[month]?.count || 0,
      }))
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
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }) // Assuming Monday is the start of the week
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

  const totalFocusTime = authUser?.totalStudyDuration || 0
  const totalSessions = authUser?.totalSessionsCompleted || 0
  const studyStreak = authUser?.studyStreak || 0

  if (allSessionsLoading || completedTodosLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-100 p-4 font-sans text-base-content-inverse">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Responsive Header */}
        <div className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="rounded-full p-2 transition duration-200 hover:bg-secondary"
            >
              <FaArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-base-content-inverse">Study Dashboard</h1>
            </div>
          </div>
          <div className="relative">
            <button onClick={() => setOpenProfileDropdown(!openProfileDropdown)}>
              <FaEllipsis />
            </button>
            {openProfileDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10 cursor-default bg-transparent"
                  onClick={() => setOpenProfileDropdown(false)}
                ></div>
                <ul className="white-shadow absolute left-4 top-4 z-20 w-48 rounded-xl bg-base-100 p-2 md:-left-48">
                  <li>
                    <button
                      onClick={() => navigate("/")}
                      className="flex w-full items-center gap-2 rounded-md p-2 transition-colors hover:bg-secondary"
                    >
                      <GoHome />
                      <span>Home</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => navigate("/pomodoro")}
                      className="flex w-full items-center gap-2 rounded-md p-2 transition-colors hover:bg-secondary"
                    >
                      <IoIosTimer />
                      <span>Pomodoro</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => navigate("/todos")}
                      className="flex w-full items-center gap-2 rounded-md p-2 transition-colors hover:bg-secondary"
                    >
                      <LuList />
                      <span>Todos</span>
                    </button>
                  </li>
                </ul>
              </>
            )}
          </div>
        </div>

        <div className="flex w-full flex-col justify-between md:flex-row-reverse">
          <div className="relative flex items-center self-center ring-4 ring-primary ring-offset-2 ring-offset-base-100 rounded-full">
            <Link to={`/profile/${authUser?.username}`} className="cursor-pointer">
              {authUser.profileImg?.imageUrl && (
                <img
                  src={authUser.profileImg.imageUrl}
                  alt="User profile"
                  className="size-24 rounded-full object-cover md:size-12"
                />
              )}
            </Link>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-base-content-inverse">
              {getGreeting()}, {authUser.fullName.split(" ")[0]}.
            </h2>
            <p className="text-lg text-neutral-400">Let's get some work done today!</p>
          </div>
        </div>

        {/* New Grid Layout */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* Quick Stats Card */}
          <BentoCard className="md:col-span-2">
            <div className="grid grid-cols-2 gap-y-4 md:grid-cols-6">
              <StatItem
                label="Total Sessions"
                value={totalSessions}
                colorClass="bg-purple-400/20 text-purple-400"
                icon={<FaCheckCircle />}
              />
              <StatItem
                label="Total Time"
                value={formatShortDuration(totalFocusTime)}
                colorClass="bg-blue-400/20 text-blue-400"
                icon={<FaHourglassHalf />}
              />
              <StatItem
                label="Current Streak"
                value={studyStreak}
                colorClass="bg-orange-400/20 text-orange-400"
                icon={<FaFire />}
              />
              <StatItem
                label="Longest Streak"
                value={longestStudyStreak}
                colorClass="bg-yellow-400/20 text-yellow-400"
                icon={<FaTachometerAlt />}
              />
              <StatItem
                label="Active Tasks"
                value={activeTodosCount?.count || 0}
                colorClass="bg-red-400/20 text-red-400"
                icon={<TbList />}
              />
              <StatItem
                label="Completed Tasks"
                value={completedTodosCount?.count || 0}
                colorClass="bg-green-400/20 text-green-400"
                icon={<TbListCheck />}
              />
            </div>
          </BentoCard>

          {/* Study Chart Card */}
          <BentoCard className="md:col-span-1">
            <div className="flex h-full flex-col">
              <div className="flex flex-col items-center justify-between md:flex-row">
                <h2 className="text-md font-semibold md:text-xl">
                  {studyView === "weekly"
                    ? "Weekly Study Progress"
                    : studyView === "monthly"
                      ? "Monthly Study Progress"
                      : "Yearly Study Progress"}
                </h2>
                <div className="flex">
                  <button
                    onClick={() => setStudyView("weekly")}
                    className={`rounded-l-md px-3 py-1 text-xs font-bold transition-colors md:text-sm ${
                      studyView === "weekly"
                        ? "bg-purple-600 text-white"
                        : "bg-base-300 text-neutral-400 hover:bg-secondary"
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setStudyView("monthly")}
                    className={`px-3 py-1 text-xs font-bold transition-colors md:text-sm ${
                      studyView === "monthly"
                        ? "bg-purple-600 text-white"
                        : "bg-base-300 text-neutral-400 hover:bg-secondary"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setStudyView("yearly")}
                    className={`rounded-r-md px-3 py-1 text-xs font-bold transition-colors md:text-sm ${
                      studyView === "yearly"
                        ? "bg-purple-600 text-white"
                        : "bg-base-300 text-neutral-400 hover:bg-secondary"
                    }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>
              <div className="relative h-48">
                <ResponsiveContainer width="100%" height="100%">
                  {studyView === "weekly" ? (
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <XAxis
                        dataKey="name"
                        interval={0}
                        stroke="#525252"
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1c1917",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        itemStyle={{ color: "#e5e7eb" }}
                        formatter={(value) => formatShortDuration(value)}
                      />
                      <Bar dataKey="time" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                      <XAxis dataKey="name" stroke="#525252" axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1c1917",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        itemStyle={{ color: "#e5e7eb" }}
                        formatter={(value) => formatShortDuration(value)}
                      />
                      <Line type="monotone" dataKey="time" stroke="#a855f7" />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </BentoCard>

          {/* Todo Chart Card */}
          <BentoCard className="md:col-span-1">
            <div className="flex h-full flex-col">
              <div className="flex flex-col items-center justify-between md:flex-row">
                <h2 className="text-md font-semibold md:text-xl">
                  {todoView === "weekly"
                    ? "Weekly Task Progress"
                    : todoView === "monthly"
                      ? "Monthly Task Progress"
                      : "Yearly Task Progress"}
                </h2>
                <div className="flex">
                  {/* Toggle buttons for weekly/monthly/yearly todoViews */}
                  <button
                    onClick={() => setTodoView("weekly")}
                    className={`rounded-l-md px-3 py-1 text-xs font-bold transition-colors md:text-sm ${
                      todoView === "weekly"
                        ? "bg-green-600 text-white"
                        : "bg-base-300 text-neutral-400 hover:bg-secondary"
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setTodoView("monthly")}
                    className={`px-3 py-1 text-xs font-bold transition-colors md:text-sm ${
                      todoView === "monthly"
                        ? "bg-green-600 text-white"
                        : "bg-base-300 text-neutral-400 hover:bg-secondary"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setTodoView("yearly")}
                    className={`rounded-r-md px-3 py-1 text-xs font-bold transition-colors md:text-sm ${
                      todoView === "yearly"
                        ? "bg-green-600 text-white"
                        : "bg-base-300 text-neutral-400 hover:bg-secondary"
                    }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>
              <div className="relative h-48">
                <ResponsiveContainer width="100%" height="100%">
                  {todoView === "weekly" ? (
                    <BarChart
                      data={todoChartData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="name"
                        stroke="#525252"
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                      />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1c1917",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        itemStyle={{ color: "#e5e7eb" }}
                        formatter={(value) => `${value} todos`}
                      />
                      <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />{" "}
                      {/* Green color */}
                    </BarChart>
                  ) : (
                    <LineChart
                      data={todoChartData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                      <XAxis dataKey="name" stroke="#525252" axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1c1917",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        itemStyle={{ color: "#e5e7eb" }}
                        formatter={(value) => `${value} todos`}
                      />
                      <Line type="monotone" dataKey="count" stroke="#22c55e" /> {/* Green color */}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </BentoCard>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {/* Study Goal Card */}
          <BentoCard className="md:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {studyGoalView === "daily" ? "Daily Study Goal" : "Weekly Study Goal"}
              </h3>
              <div className="flex">
                <button
                  onClick={() => setStudyGoalView("daily")}
                  className={`rounded-l-md px-3 py-1 text-xs font-bold transition-colors md:text-sm ${
                    studyGoalView === "daily"
                      ? "bg-purple-600 text-white"
                      : "bg-base-300 text-neutral-400 hover:bg-secondary"
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setStudyGoalView("weekly")}
                  className={`rounded-r-md px-3 py-1 text-xs font-bold transition-colors md:text-sm ${
                    studyGoalView === "weekly"
                      ? "bg-purple-600 text-white"
                      : "bg-base-300 text-neutral-400 hover:bg-secondary"
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => navigate("/study-dashboard/goals")}
                  className="ml-2 rounded-md bg-purple-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-purple-700"
                >
                  <FaPen />
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="h-32 w-32">
                <CircularProgressbar
                  value={studyGoalProgress}
                  text={`${studyGoalProgress.toFixed(1)}%`}
                  styles={buildStyles({
                    pathColor: `rgba(168, 85, 247, ${Math.max(studyGoalProgress / 100, 0.3)})`,
                    trailColor: "#262626",
                    textColor: baseContentInverseColor || "white",
                    strokeLinecap: "round",
                  })}
                />
              </div>
              <p className="text-sm font-medium text-neutral-400">
                {formatShortDuration(currentStudyDuration)} of {currentStudyGoal} {studyGoalView}{" "}
                hours
              </p>
            </div>
          </BentoCard>

          {/* Todo Goal Card */}
          <BentoCard className="md:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {todoGoalView === "daily" ? "Daily Task Goal" : "Weekly Task Goal"}
              </h3>
              <div className="flex">
                <button
                  onClick={() => setTodoGoalView("daily")}
                  className={`rounded-l-md px-3 py-1 text-xs font-bold transition-colors md:text-sm ${
                    todoGoalView === "daily"
                      ? "bg-green-600 text-white"
                      : "bg-base-300 text-neutral-400 hover:bg-secondary"
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setTodoGoalView("weekly")}
                  className={`rounded-r-md px-3 py-1 text-xs font-bold transition-colors md:text-sm ${
                    todoGoalView === "weekly"
                      ? "bg-green-600 text-white"
                      : "bg-base-300 text-neutral-400 hover:bg-secondary"
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => navigate("/study-dashboard/goals")}
                  className="ml-2 rounded-md bg-green-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-green-700"
                >
                  <FaPen />
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="h-32 w-32">
                <CircularProgressbar
                  value={todoGoalProgress}
                  text={`${Math.round(todoGoalProgress)}%`}
                  styles={buildStyles({
                    pathColor: `rgba(34, 197, 94, ${Math.max(todoGoalProgress / 100, 0.3)})`,
                    trailColor: "#262626",
                    textColor: baseContentInverseColor || "#e5e7eb", // ⭐ Use the dynamic color here
                    strokeLinecap: "round",
                  })}
                />
              </div>
              <p className="text-sm font-medium text-neutral-400">
                {currentTodoCount} of {currentTodoGoal} {todoGoalView} tasks
              </p>
            </div>
          </BentoCard>

          {/* My Badges Card */}
          <BentoCard className="md:col-span-1">
            <h3 className="text-lg font-bold">My Badges</h3>
            {authUser?.badges && <BadgeDisplay badges={authUser.badges} />}
          </BentoCard>
        </div>
      </div>
    </div>
  )
}

export default StudyDashboardPage
