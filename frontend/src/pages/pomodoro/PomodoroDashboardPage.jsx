import { useState } from "react"
import { FaCog, FaCheckCircle, FaHourglassHalf, FaTachometerAlt, FaFire } from "react-icons/fa"
import { FaArrowLeft, FaEllipsis } from "react-icons/fa6"
import { TbList, TbListCheck } from "react-icons/tb"
import { LuList } from "react-icons/lu"
import { IoIosTimer } from "react-icons/io"
import { GoHome } from "react-icons/go"
import { Link, useNavigate } from "react-router-dom"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { useGoalStore } from "../../store/useGoalStore"
import { useGetCompletedTodosCount } from "../../features/todos/todoHooks/useGetCompletedTodosCount"
import { useGetActiveTodosCount } from "../../features/todos/todoHooks/useGetActiveTodosCount"
import { useGetCompletedTodosWithDates } from "../../features/todos/todoHooks/useGetCompletedTodosWithDates"
import { useGetAllSessions } from "../../features/pomodoro/pomodoroHooks/useGetAllSessions"
import { formatShortDuration, getGreeting } from "../../utils/dashboardUtils"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import { BentoCard } from "../../components/common/BentoCard"
import { StatItem } from "../../components/common/StatItem"
import BadgeDisplay from "../../components/common/BadgeDisplay"
import { useDashboardData } from "../../hooks/customHooks/useDashboardData"
import { GoalProgressCard } from "../../features/study-dashboard/GoalProgressCard"
import { ChartComponent } from "../../features/study-dashboard/ChartComponent"
import { getOptimizedImageUrl } from "../../utils/cloudinaryUtils"

const StudyDashboardPage = () => {
  const { authUser } = useAuthUser()
  const [studyView, setStudyView] = useState("weekly")
  const [todoView, setTodoView] = useState("weekly")
  const [todoGoalView, setTodoGoalView] = useState("daily")
  const [studyGoalView, setStudyGoalView] = useState("daily")
  const [openProfileDropdown, setOpenProfileDropdown] = useState(false)
  const navigate = useNavigate()

  const { dailyGoalHours, dailyTodoGoal, weeklyTodoGoal, weeklyGoalHours } = useGoalStore()
  const { completedTodos, completedTodosLoading } = useGetCompletedTodosWithDates()
  const { allSessions, allSessionsLoading } = useGetAllSessions()
  const { completedTodosCount, loadingCompletedTodosCount } = useGetCompletedTodosCount()
  const { activeTodosCount, loadingActiveTodosCount } = useGetActiveTodosCount()

  const {
    chartData,
    todoChartData,
    studyGoalProgress,
    todoGoalProgress,
    currentStudyDuration,
    currentStudyGoal,
    currentTodoCount,
    currentTodoGoal,
  } = useDashboardData({
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
  })

  if (
    allSessionsLoading ||
    completedTodosLoading ||
    loadingCompletedTodosCount ||
    loadingActiveTodosCount
  ) {
    return (
      <div className="flex h-screen items-center justify-center bg-base-100">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-100 p-4 font-sans template">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Header */}
        <div className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="rounded-full p-2 template transition-colors hover:bg-gray-700 hover:text-white"
            >
              <FaArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold template">Dashboard</h1>
            </div>
          </div>
          <div className="relative flex items-center gap-1">
            <button
              onClick={() => navigate("/study-dashboard/settings")}
              className="rounded-full p-2 template transition-colors hover:bg-gray-700 hover:text-white"
            >
              <FaCog />
            </button>
            <button
              onClick={() => setOpenProfileDropdown(!openProfileDropdown)}
              className="rounded-full p-2 template transition-colors hover:bg-gray-700 hover:text-white"
            >
              <FaEllipsis />
            </button>
            {openProfileDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10 cursor-default bg-transparent"
                  onClick={() => setOpenProfileDropdown(false)}
                ></div>
                <ul className="white-shadow absolute right-4 top-4 z-20 w-48 rounded-xl bg-base-100 p-2 md:-left-48">
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

        {/* User Info */}
        <div className="flex w-full flex-col justify-between md:flex-row-reverse">
          <div className="relative my-4 flex items-center self-center rounded-full ring-4 ring-primary ring-offset-2 ring-offset-base-100 md:ring-2">
            <Link to={`/profile/${authUser?.username}`} className="cursor-pointer">
              {authUser.profileImg?.imageUrl && (
                <img
                  src={getOptimizedImageUrl(authUser.profileImg.imageUrl, "avatar")}
                  alt="User profile"
                  className="size-24 rounded-full object-cover md:size-12"
                />
              )}
            </Link>
          </div>
          <div>
            <h2 className="text-3xl font-bold template">
              {getGreeting()}, {authUser.fullName.split(" ")[0]}.
            </h2>
            <p className="text-neutral-400">Track your progress and stay focused</p>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {/* Quick Stats Card */}
          <BentoCard className="md:col-span-2">
            <div className="grid grid-cols-2 gap-y-4 md:grid-cols-6">
              <StatItem
                label="Total Sessions"
                value={authUser?.totalSessionsCompleted}
                colorClass="bg-purple-400/20 text-purple-400"
                icon={<FaCheckCircle />}
              />
              <StatItem
                label="Total Time"
                value={formatShortDuration(authUser?.totalStudyDuration)}
                colorClass="bg-blue-400/20 text-blue-400"
                icon={<FaHourglassHalf />}
              />
              <StatItem
                label="Current Streak"
                value={authUser?.studyStreak}
                colorClass="bg-orange-400/20 text-orange-400"
                icon={<FaFire />}
              />
              <StatItem
                label="Longest Streak"
                value={authUser?.longestStudyStreak}
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
                <h2 className="text-md mb-1 font-semibold md:text-xl">
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
              <ChartComponent
                data={chartData}
                view={studyView}
                type="time"
                color="#a855f7"
                tooltipFormatter={(value) => formatShortDuration(value)}
              />
            </div>
          </BentoCard>

          {/* Todo Chart Card */}
          <BentoCard className="md:col-span-1">
            <div className="flex h-full flex-col">
              <div className="flex flex-col items-center justify-between md:flex-row">
                <h2 className="text-md mb-1 font-semibold md:text-xl">
                  {todoView === "weekly"
                    ? "Weekly Task Progress"
                    : todoView === "monthly"
                      ? "Monthly Task Progress"
                      : "Yearly Task Progress"}
                </h2>
                <div className="flex">
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
              <ChartComponent
                data={todoChartData}
                view={todoView}
                type="count"
                color="#22c55e"
                tooltipFormatter={(value) => `${value} todos`}
              />
            </div>
          </BentoCard>
        </div>

        {/* Goal Cards */}
        <div className="grid gap-5 md:grid-cols-3">
          <GoalProgressCard
            title="Study Goal"
            dailyLabel="Daily Study Goal"
            weeklyLabel="Weekly Study Goal"
            goalView={studyGoalView}
            setGoalView={setStudyGoalView}
            progress={studyGoalProgress}
            currentCount={formatShortDuration(currentStudyDuration)}
            currentGoal={currentStudyGoal}
            color="purple"
            unit="hours"
          />
          <GoalProgressCard
            title="Todo Goal"
            dailyLabel="Daily Task Goal"
            weeklyLabel="Weekly Task Goal"
            goalView={todoGoalView}
            setGoalView={setTodoGoalView}
            progress={todoGoalProgress}
            currentCount={currentTodoCount}
            currentGoal={currentTodoGoal}
            color="green"
            unit="tasks"
          />
          <BentoCard className="md:col-span-1">
            <h3 className="text-md font-semibold">My Badges</h3>
            {authUser?.badges && <BadgeDisplay badges={authUser.badges} />}
          </BentoCard>
        </div>
      </div>
    </div>
  )
}

export default StudyDashboardPage
