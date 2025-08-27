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
} from "recharts"
import { format, isThisWeek, isThisMonth, isThisYear } from "date-fns"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import { Link, useNavigate } from "react-router-dom"
import { useGetCompletedTodosCount } from "../../features/todos/todoHooks/useGetCompletedTodosCount"
import { useGetActiveTodosCount } from "../../features/todos/todoHooks/useGetActiveTodosCount"
import BadgeDisplay from "../../components/common/BadgeDisplay"
import { FaArrowLeft } from "react-icons/fa6"
import { BsListTask } from "react-icons/bs"
import { GrTask } from "react-icons/gr"
import { TbList, TbListCheck } from "react-icons/tb"

const formatShortDuration = (minutes) => {
  if (isNaN(minutes) || minutes < 0) return "0m"
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours > 0) {
    return `${hours}h`
  }
  return `${remainingMinutes}m`
}

const BentoCard = ({ children, className }) => (
  <div
    className={`rounded-xl border border-accent bg-base-300 p-5 shadow-inner backdrop-blur-sm ${className}`}
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

const StudyDashboardPage = () => {
  const { authUser } = useAuthUser()
  const [view, setView] = useState("weekly")
  // New state for the user's custom daily goal in hours
  const [dailyGoalHours, setDailyGoalHours] = useState(4)
  const navigate = useNavigate()

  const { data: allSessions, isLoading: allSessionsLoading } = useQuery({
    queryKey: ["studyHistory"],
    queryFn: fetchAllSessions,
  })

  const { completedTodosCount, loadingCompletedTodosCount } = useGetCompletedTodosCount()
  const { activeTodosCount, loadingActiveTodosCount } = useGetActiveTodosCount()
  const longestStudyStreak = authUser?.longestStudyStreak || 0

  const chartData = useMemo(() => {
    if (!allSessions) return []
    const groupedData = {}
    allSessions.forEach((session) => {
      const sessionDate = new Date(session.date)
      let key
      let shouldInclude = false
      if (view === "weekly" && isThisWeek(sessionDate, { weekStartsOn: 1 })) {
        key = format(sessionDate, "EEEE")
        shouldInclude = true
      } else if (view === "monthly" && isThisMonth(sessionDate)) {
        key = format(sessionDate, "MMM d")
        shouldInclude = true
      } else if (view === "yearly" && isThisYear(sessionDate)) {
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
    const dataArray = Object.values(groupedData)
    if (view === "monthly") {
      dataArray.sort((a, b) => new Date(a.name) - new Date(b.name))
    }
    return dataArray
  }, [allSessions, view])

  const studyDurationToday = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd")
    const totalToday = allSessions
      ?.filter((session) => format(new Date(session.date), "yyyy-MM-dd") === today)
      .reduce((sum, session) => sum + session.duration, 0)
    return totalToday || 0
  }, [allSessions])

  const dailyGoalProgress = useMemo(() => {
    const dailyGoalMinutes = dailyGoalHours * 60
    if (dailyGoalMinutes <= 0) return 0
    return Math.min((studyDurationToday / dailyGoalMinutes) * 100, 100)
  }, [studyDurationToday, dailyGoalHours])

  const totalFocusTime = authUser?.totalStudyDuration || 0
  const totalSessions = authUser?.totalSessionsCompleted || 0
  const studyStreak = authUser?.studyStreak || 0

  if (allSessionsLoading || loadingCompletedTodosCount || loadingActiveTodosCount) {
    return (
      <div className="flex h-screen items-center justify-center bg-base-100">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-100 p-4 font-sans text-base-content-inverse">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="flex items-center gap-2">
              <button onClick={() => navigate(-1)}>
                <FaArrowLeft />
              </button>
              <h1 className="text-2xl font-bold text-base-content-inverse">Study Dashboard</h1>
            </span>
            <p className="text-neutral-400">Track your progress and stay focused</p>
          </div>
        </div>

        {/* New Grid Layout */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* Main Chart Card */}
          <BentoCard className="lg:col-span-2">
            <div className="flex h-full flex-col">
              <div className="flex flex-col items-center justify-between md:flex-row">
                <h2 className="text-md font-semibold md:text-xl">
                  {view === "weekly"
                    ? "Weekly Progress"
                    : view === "monthly"
                      ? "Monthly Progress"
                      : "Yearly Progress"}
                </h2>
                <div className="flex">
                  <button
                    onClick={() => setView("weekly")}
                    className={`rounded-l-md px-3 py-1 text-xs font-bold transition-colors md:text-sm ${
                      view === "weekly"
                        ? "bg-purple-600 text-white"
                        : "bg-neutral-700 text-neutral-400"
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setView("monthly")}
                    className={`px-3 py-1 text-xs font-bold transition-colors md:text-sm ${
                      view === "monthly"
                        ? "bg-purple-600 text-white"
                        : "bg-neutral-700 text-neutral-400"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setView("yearly")}
                    className={`rounded-r-md px-3 py-1 text-xs font-bold transition-colors md:text-sm ${
                      view === "yearly"
                        ? "bg-purple-600 text-white"
                        : "bg-neutral-700 text-neutral-400"
                    }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>
              <div className="relative h-48">
                <ResponsiveContainer width="100%" height="100%">
                  {view === "weekly" ? (
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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

          {/* Quick Stats Card */}
          <BentoCard>
            <h3 className="mb-4 text-lg font-bold">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-y-4">
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

          {/* Daily Goal Card */}
          <BentoCard className="md:col-span-2 lg:col-span-1">
            <h3 className="mb-4 text-lg font-bold">Daily Goal</h3>
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="h-32 w-32">
                <CircularProgressbar
                  value={dailyGoalProgress}
                  text={`${Math.round(dailyGoalProgress)}%`}
                  styles={buildStyles({
                    pathColor: `rgba(168, 85, 247, ${Math.max(dailyGoalProgress / 100, 0.3)})`,
                    trailColor: "#262626",
                    textColor: "#e5e7eb",
                    strokeLinecap: "round",
                  })}
                />
              </div>
              <p className="text-sm font-medium text-neutral-400">
                {formatShortDuration(studyDurationToday)} of {dailyGoalHours} hours today
              </p>
              <div className="flex w-full items-center justify-center space-x-2">
                <input
                  type="number"
                  min="0"
                  value={dailyGoalHours}
                  onChange={(e) => setDailyGoalHours(e.target.value)}
                  className="w-20 rounded-md bg-neutral-700 p-2 text-center text-sm text-base-content-inverse focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-neutral-400">hours</span>
              </div>
            </div>
          </BentoCard>

          {/* My Badges Card */}
          <BentoCard className="md:col-span-2 lg:col-span-1">
            <h3 className="text-lg font-bold">My Badges</h3>
            {authUser?.badges && <BadgeDisplay badges={authUser.badges} />}
          </BentoCard>

          {/* Add Task Button Card */}
          {/* <button className="flex items-center justify-center gap-2 rounded-2xl bg-[#FFC000] py-4 text-lg font-bold text-black shadow-xl transition-colors hover:bg-[#E5B000] md:col-span-2 lg:col-span-1">
            <FaPlus /> Add Task
          </button> */}
        </div>

        {/* The link remains at the bottom */}
        {/* <div className="mt-5">
          <Link to="/pomodoro">go to pomodoro</Link>
        </div> */}
      </div>
    </div>
  )
}

export default StudyDashboardPage
