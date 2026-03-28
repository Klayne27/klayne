import { useState } from "react"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import { Link, useNavigate } from "react-router-dom"
import { FaArrowLeft, FaClock, FaTrophy, FaCalendar, FaCrown } from "react-icons/fa6"
import { FaFire, FaInfoCircle } from "react-icons/fa"
import { IoClose } from "react-icons/io5"
import { FaCheckCircle } from "react-icons/fa"
import LoadingSpinner from "../components/common/LoadingSpinner"
import { useGetTotalLeaderboard } from "../features/pomodoro/pomodoroHooks/useGetTotalLeaderboard"
import { useGetMonthlyLeaderboard } from "../features/pomodoro/pomodoroHooks/useGetMonthlyLeaderboard"
import { useGetWeeklyLeaderboard } from "../features/pomodoro/pomodoroHooks/useGetWeeklyLeaderboard"
import { useGetPreviousWinners } from "../features/pomodoro/pomodoroHooks/useGetPreviousWinners"
import { useGetPreviousWeekWinners } from "../features/pomodoro/pomodoroHooks/useGetPreviousWeekWinners"
import useLockBodyScroll from "../hooks/customHooks/useLockBodyScroll"
import { getBadgeIcon } from "../utils/badgeUtils.jsx"

function StudyLeaderboardPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [leaderboardType, setLeaderboardType] = useState("total")
  const [showPreviousWinners, setShowPreviousWinners] = useState(true)
  const [isInfoDropdownOpen, setIsInfoDropdownOpen] = useState(false)

  useLockBodyScroll(isInfoDropdownOpen)

  const { authUser: currentUser } = useAuthUser()

  const totalLeaderboard = useGetTotalLeaderboard(page, { enabled: leaderboardType === "total" })
  const monthlyLeaderboard = useGetMonthlyLeaderboard(page, {
    enabled: leaderboardType === "monthly",
  })
  const weeklyLeaderboard = useGetWeeklyLeaderboard(page, { enabled: leaderboardType === "weekly" })

  const { previousWinners } = useGetPreviousWinners()
  const { previousWeekWinners } = useGetPreviousWeekWinners()

  const currentLeaderboard =
    leaderboardType === "total"
      ? totalLeaderboard
      : leaderboardType === "monthly"
        ? monthlyLeaderboard
        : weeklyLeaderboard

  const { leaderboard, totalPages, isLoading, currentWeekStart } = currentLeaderboard

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage)
  }

  const handleLeaderboardTypeChange = (type) => {
    setLeaderboardType(type)
    setPage(1)
  }

  const getRankColor = (rank) => {
    switch (rank) {
      case 1:
        return "ring-amber-400 bg-amber-300/40 border-amber-400"
      case 2:
        return "ring-slate-400 bg-slate-300/40 border-slate-400"
      case 3:
        return "ring-yellow-800 bg-yellow-700/40 border-yellow-800"
      default:
        return "ring-base-300 bg-base-200"
    }
  }

  const getRankIndexColor = (rank) => {
    switch (rank) {
      case 1:
        return "text-amber-400"
      case 2:
        return "text-slate-400"
      case 3:
        return "text-yellow-800"
      default:
        return ""
    }
  }

  const getFireColor = (streak) => {
    if (streak < 7) return "text-yellow-500"
    if (streak < 15) return "text-orange-500"
    if (streak < 30) return "text-red-500"
    return "text-blue-500"
  }

  // Format "2025-03-24" → "Mar 24 – Mar 30"
  const formatWeekRange = (weekStartStr) => {
    if (!weekStartStr) return ""
    const start = new Date(weekStartStr)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    return `${fmt(start)} – ${fmt(end)}`
  }

  const date = new Date()
  const currentMonthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(date)

  const renderPaginationButtons = () => {
    const buttons = []
    const maxButtons = 5
    buttons.push(
      <button
        key={1}
        className={`btn join-item ${page === 1 ? "btn-active" : ""}`}
        onClick={() => handlePageChange(1)}
      >
        1
      </button>,
    )
    if (page > 3)
      buttons.push(
        <button key="dots-start" className="btn join-item pointer-events-none">
          ...
        </button>,
      )
    let startPage = Math.max(2, page - Math.floor(maxButtons / 2) + 1)
    let endPage = Math.min(totalPages - 1, page + Math.floor(maxButtons / 2) - 1)
    if (endPage - startPage + 1 < maxButtons - 2) {
      if (startPage === 2)
        endPage = Math.min(totalPages - 1, endPage + (maxButtons - 2 - (endPage - startPage + 1)))
      else if (endPage === totalPages - 1)
        startPage = Math.max(2, startPage - (maxButtons - 2 - (endPage - startPage + 1)))
    }
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          className={`btn join-item ${page === i ? "btn-active" : ""}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>,
      )
    }
    if (page < totalPages - 2)
      buttons.push(
        <button key="dots-end" className="btn join-item pointer-events-none">
          ...
        </button>,
      )
    if (totalPages > 1)
      buttons.push(
        <button
          key={totalPages}
          className={`btn join-item ${page === totalPages ? "btn-active" : ""}`}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </button>,
      )
    return buttons
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <LoadingSpinner />
      </div>
    )
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-4 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-2 flex flex-shrink-0 items-center gap-6 rounded-full p-2.5 transition duration-200 hover:bg-gray-800 hover:text-white"
          >
            <FaArrowLeft className="text-xl" />
          </button>
          <h2 className="flex-1 text-center text-2xl font-bold">Study Leaderboard</h2>
        </div>

        {/* Type tabs — shown even on empty state so user can switch */}
        <div className="mb-6 flex justify-center">
          <div className="join">
            <button
              className={`btn join-item ${leaderboardType === "total" ? "btn-primary btn-active" : ""}`}
              onClick={() => handleLeaderboardTypeChange("total")}
            >
              <FaTrophy className="mr-2" /> All Time
            </button>
            <button
              className={`btn join-item ${leaderboardType === "weekly" ? "btn-primary btn-active" : ""}`}
              onClick={() => handleLeaderboardTypeChange("weekly")}
            >
              <FaCalendar className="mr-2" /> This Week
            </button>
            <button
              className={`btn join-item ${leaderboardType === "monthly" ? "btn-primary btn-active" : ""}`}
              onClick={() => handleLeaderboardTypeChange("monthly")}
            >
              <FaCalendar className="mr-2" /> This Month
            </button>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center text-gray-500">
          No study data available for this period yet.
        </div>
      </div>
    )
  }

  // Shared winners panel renderer
  const renderWinnersPanel = (winners, label) => {
    if (!winners || winners.winners?.length === 0) return null
    return (
      <div className="mb-6 rounded-xl border border-base-300 bg-base-100 p-4 shadow-xl">
        <div className="mb-4 text-center">
          <h3 className="mb-1 text-2xl font-extrabold text-primary">Previous Winners 🏆</h3>
          <p className="text-sm font-medium text-base-content/70">{label}</p>
        </div>
        <div className="flex justify-center gap-6">
          {winners.winners.map((winner, index) => (
            <div key={winner.user._id} className="flex flex-col items-center text-center">
              <div className="relative">
                {index === 0 && (
                  <FaCrown
                    className="absolute -top-3 left-2/3 -translate-x-1/2 -translate-y-1/2 rotate-12 text-amber-400 drop-shadow-md"
                    size={32}
                  />
                )}
                <Link to={`/profile/${winner.user.username}`} className="block">
                  <div
                    className={`avatar transition-transform duration-200 hover:scale-105 ${index === 0 ? "ring-4 ring-amber-400" : index === 1 ? "ring-4 ring-slate-400" : "ring-4 ring-yellow-800"} h-12 w-12 rounded-full ring-offset-2 ring-offset-base-100`}
                  >
                    <img
                      src={winner.user.profileImg?.imageUrl || "/avatar-placeholder.png"}
                      alt={`${winner.user.fullName} avatar`}
                      className="rounded-full"
                    />
                  </div>
                </Link>
              </div>
              <p className="mt-2 max-w-[80px] truncate text-sm font-bold text-base-content/90">
                {winner.user.fullName}
              </p>
              <div className="flex items-center gap-1 text-sm font-semibold text-primary/80">
                <FaClock className="text-sm" />
                <span>
                  {Math.floor(winner.studyDuration / 60)}h {winner.studyDuration % 60}m
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="template container mx-auto max-w-2xl p-4">
      {/* Header */}
      <div className="mb-6 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 flex-shrink-0 rounded-full p-2.5 transition duration-200 hover:bg-gray-800 hover:text-white"
        >
          <FaArrowLeft className="text-xl" />
        </button>
        <h2 className="flex-1 text-center text-2xl font-bold">Study Leaderboard</h2>
        {leaderboardType === "monthly" ? (
          <div className="relative">
            <button
              onClick={() => setIsInfoDropdownOpen(!isInfoDropdownOpen)}
              className="rounded-full p-2 transition-colors hover:bg-gray-700 hover:text-white focus:outline-none"
            >
              <FaInfoCircle className="h-5 w-5" />
            </button>
            {isInfoDropdownOpen && (
              <div
                className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
                onClick={() => setIsInfoDropdownOpen(false)}
              >
                <div
                  className="max-h-[80vh] w-full max-w-lg rounded-lg bg-gray-800 p-4 text-sm text-base-content shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-4 flex w-full items-center justify-between border-b border-gray-600 pb-3">
                    <h4 className="text-lg font-bold">Monthly Leaderboard</h4>
                    <span onClick={() => setIsInfoDropdownOpen(false)}>
                      <IoClose size={20} className="cursor-pointer" />
                    </span>
                  </div>
                  <ul className="list-inside list-disc space-y-2">
                    <li>At the start of every month, all users' monthly stats will reset to 0.</li>
                    <li>
                      At the end of each month, the top 3 users will earn special badges as a reward
                      for their hard work.
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-9" />
        )}
      </div>

      {/* Type tabs */}
      <div className="mb-6 flex justify-center">
        <div className="join">
          <button
            className={`btn join-item ${leaderboardType === "total" ? "btn-primary btn-active" : ""}`}
            onClick={() => handleLeaderboardTypeChange("total")}
          >
            <FaTrophy className="mr-2" /> All Time
          </button>
          <button
            className={`btn join-item ${leaderboardType === "weekly" ? "btn-primary btn-active" : ""}`}
            onClick={() => handleLeaderboardTypeChange("weekly")}
          >
            <FaCalendar className="mr-2" /> This Week
          </button>
          <button
            className={`btn join-item ${leaderboardType === "monthly" ? "btn-primary btn-active" : ""}`}
            onClick={() => handleLeaderboardTypeChange("monthly")}
          >
            <FaCalendar className="mr-2" /> This Month
          </button>
        </div>
      </div>

      {/* Previous winners toggle + panel */}
      {(leaderboardType === "monthly" || leaderboardType === "weekly") && (
        <button
          onClick={() => setShowPreviousWinners((s) => !s)}
          className="mb-2 flex items-center justify-center rounded-lg bg-secondary px-3 py-2 text-primary"
        >
          {showPreviousWinners ? "Hide Winners" : "Show Previous Winners"}
        </button>
      )}

      {showPreviousWinners &&
        leaderboardType === "monthly" &&
        renderWinnersPanel(previousWinners, `Top 3 for ${previousWinners?.month}`)}

      {showPreviousWinners &&
        leaderboardType === "weekly" &&
        renderWinnersPanel(
          previousWeekWinners,
          `Week of ${formatWeekRange(previousWeekWinners?.weekStart)}`,
        )}

      {/* Subtitle */}
      <div className="mb-4 text-center">
        {leaderboardType === "monthly" && (
          <p className="mt-2 text-sm text-base-content/70">
            Resets every month • Current: {currentMonthName}
          </p>
        )}
        {leaderboardType === "weekly" && (
          <p className="mt-2 text-sm text-base-content/70">
            Resets every Monday • Current week: {formatWeekRange(currentWeekStart)}
          </p>
        )}
      </div>

      {/* Leaderboard list */}
      <ul className="space-y-4">
        {leaderboard.map((entry, index) => {
          const globalRank = (page - 1) * 10 + index + 1
          return (
            <li
              key={entry._id}
              className={`flex flex-col items-start rounded-lg p-3 md:flex-row md:items-center md:gap-0 ${getRankColor(globalRank)} relative border border-accent shadow-lg transition-transform duration-200 ease-in-out ${currentUser && currentUser._id === entry._id ? "scale-[1.05]" : ""}`}
            >
              <div className="flex w-full items-center md:w-auto">
                <span
                  className={`mr-4 text-center text-lg font-bold md:w-10 ${getRankIndexColor(globalRank)}`}
                >
                  {globalRank}.
                </span>
                <Link to={`/profile/${entry?.username}`} className="mr-3 flex-shrink-0">
                  <div className="avatar">
                    <div
                      className={`${getRankColor(globalRank)} w-10 rounded-full ring ring-offset-2 ring-offset-base-100 md:w-12`}
                    >
                      <img
                        src={entry?.profileImg?.imageUrl || "/avatar-placeholder.png"}
                        alt={`${entry.fullName} avatar`}
                      />
                    </div>
                    {globalRank === 1 && (
                      <FaCrown
                        className="absolute -top-[27px] z-50 translate-x-1/2 rotate-[19deg] text-amber-400 md:translate-x-2/3"
                        size={30}
                      />
                    )}
                  </div>
                </Link>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/profile/${entry.username}`}
                      className="text-md truncate font-bold hover:underline md:text-lg"
                    >
                      {entry.fullName}
                    </Link>
                    {entry.preferredBadge && (
                      <div className="ml-1 size-[17px] flex-shrink-0">
                        {getBadgeIcon(entry.preferredBadge)}
                      </div>
                    )}
                    {leaderboardType === "total" && entry.studyStreak >= 3 && (
                      <div
                        className={`order-1 flex items-center gap-1 text-sm font-semibold ${getFireColor(entry.studyStreak)} md:order-none md:ml-auto`}
                      >
                        <FaFire className="text-xl" />
                        <span>{entry.studyStreak}</span>
                      </div>
                    )}
                    {leaderboardType === "monthly" && entry.monthlyStudyStreak >= 3 && (
                      <div
                        className={`order-1 flex items-center gap-1 text-sm font-semibold ${getFireColor(entry.monthlyStudyStreak)} md:order-none md:ml-auto`}
                      >
                        <FaFire className="text-xl" />
                        <span>{entry.monthlyStudyStreak}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex">
                    <p className="truncate rounded-lg bg-slate-700/70 px-2 text-sm text-slate-400">
                      Level {entry.pomodoroLevel}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-wrap items-center justify-between md:ml-auto md:w-auto md:flex-col md:flex-nowrap md:justify-end">
                <div className="order-2 ml-0 mt-2 flex items-center gap-1 text-sm font-semibold md:order-none md:ml-4 md:mt-0">
                  <FaClock className="text-sm" />
                  <span>
                    {Math.floor(entry.totalStudyDuration / 60)}h {entry.totalStudyDuration % 60}m
                  </span>
                </div>
                <div className="order-2 ml-0 mt-2 flex items-center gap-1 text-sm font-semibold text-slate-500 md:order-none md:ml-4 md:mt-0">
                  <FaCheckCircle className="text-sm" />
                  <span>{entry.totalSessionsCompleted} sessions</span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <div className="join">
            <button
              className="btn join-item"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              «
            </button>
            {renderPaginationButtons()}
            <button
              className="btn join-item"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudyLeaderboardPage
