import { useState } from "react"
import { useAuthUser } from "../hooks/authHooks/useAuthUser"
import {
  useGetTotalLeaderboard,
  useGetMonthlyLeaderboard,
  useGetLeaderboardStats,
  useGetPreviousWinners,
} from "../hooks/pomodoroHooks/usePomodo"
import { Link, useNavigate } from "react-router-dom"
import { FaArrowLeft, FaClock, FaFire, FaTrophy, FaCalendar, FaCrown } from "react-icons/fa6"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import { FaCheckCircle } from "react-icons/fa"
import { renderHourBadge, renderSessionBadge, renderStreakBadge } from "../utils/renderBadges"


function StudyLeaderboard() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [leaderboardType, setLeaderboardType] = useState("total") // "total" or "monthly"
  const [showPreviousWinners, setShowPreviousWinners] = useState(false)

  const { authUser: currentUser } = useAuthUser()

  const totalLeaderboard = useGetTotalLeaderboard(leaderboardType === "total" ? page : 1)
  const monthlyLeaderboard = useGetMonthlyLeaderboard(leaderboardType === "monthly" ? page : 1)
  const { previousWinners, isLoadingPreviousWinners } = useGetPreviousWinners()

  const currentLeaderboard = leaderboardType === "total" ? totalLeaderboard : monthlyLeaderboard
  const { leaderboard, totalPages, isLoading } = currentLeaderboard

  // Logic to determine if monthly leaderboard should be active
  // const isMonthlyLeaderboardActive = new Date().getMonth() >= 8 // September is month 8 (0-indexed)


  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  const handleLeaderboardTypeChange = (type) => {
    setLeaderboardType(type)
    setPage(1) // Reset to first page when switching types
  }

  const renderPaginationButtons = () => {
    const buttons = []
    const maxButtons = 5 // Maximum number of page buttons to show

    buttons.push(
      <button
        key={1}
        className={`btn join-item ${page === 1 ? "btn-active" : ""}`}
        onClick={() => handlePageChange(1)}
      >
        1
      </button>,
    )

    if (page > 3) {
      buttons.push(
        <button key="dots-start" className="btn join-item pointer-events-none">
          ...
        </button>,
      )
    }

    let startPage = Math.max(2, page - Math.floor(maxButtons / 2) + 1)
    let endPage = Math.min(totalPages - 1, page + Math.floor(maxButtons / 2) - 1)

    if (endPage - startPage + 1 < maxButtons - 2) {
      if (startPage === 2) {
        endPage = Math.min(totalPages - 1, endPage + (maxButtons - 2 - (endPage - startPage + 1)))
      } else if (endPage === totalPages - 1) {
        startPage = Math.max(2, startPage - (maxButtons - 2 - (endPage - startPage + 1)))
      }
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

    if (page < totalPages - 2) {
      buttons.push(
        <button key="dots-end" className="btn join-item pointer-events-none">
          ...
        </button>,
      )
    }

    if (totalPages > 1 && totalPages !== 1) {
      buttons.push(
        <button
          key={totalPages}
          className={`btn join-item ${page === totalPages ? "btn-active" : ""}`}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </button>,
      )
    }

    return buttons
  }

  const getRankColor = (rank) => {
    switch (rank) {
      case 1:
        return "ring-amber-400 bg-amber-300/30"
      case 2:
        return "ring-slate-400 bg-slate-300/30"
      case 3:
        return "ring-yellow-800 bg-yellow-700/30"
      default:
        return "ring-base-300 bg-base-200"
    }
  }

  const date = new Date()

  const currentMonthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(date)

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
        <div className="mt-8 flex items-center justify-center text-gray-500">
          No study data available to create a leaderboard yet.
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <div className="mb-6 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 flex-shrink-0 rounded-full p-2.5 transition duration-200 hover:bg-gray-800 hover:text-white"
        >
          <FaArrowLeft className="text-xl" />
        </button>
        <h2 className="flex-1 text-center text-2xl font-bold">Study Leaderboard</h2>
      </div>

      {/* Toggle Buttons */}
      <div className="mb-6 flex justify-center">
        <div className="join">
          <button
            className={`btn join-item ${
              leaderboardType === "total" ? "btn-primary btn-active" : ""
            }`}
            onClick={() => handleLeaderboardTypeChange("total")}
          >
            <FaTrophy className="mr-2" />
            All Time
          </button>
          <button
            className={`btn join-item ${
              leaderboardType === "monthly" ? "btn-primary btn-active" : ""
            }`}
            onClick={() => handleLeaderboardTypeChange("monthly")}
          >
            <FaCalendar className="mr-2" />
            This Month
          </button>
        </div>
      </div>

      {leaderboardType === "monthly" && (
        <button
          onClick={() => setShowPreviousWinners((show) => !show)}
          className="rounded-lg bg-secondary px-3 py-2 mb-2 items-center flex justify-center text-primary"
        >
          {showPreviousWinners ? "Hide Winners" : "Show Previous Winners"}
        </button>
      )}

      {leaderboardType === "monthly" &&
        showPreviousWinners &&
        previousWinners &&
        previousWinners.winners.length > 0 && (
          <div className="mb-6 rounded-xl border border-base-300 bg-base-100 p-4 shadow-xl">
            <div className="mb-4 text-center">
              <h3 className="mb-1 text-2xl font-extrabold text-primary">Previous Winners 🏆</h3>
              <p className="text-sm font-medium text-base-content/70">
                Top 3 for {previousWinners.month}
              </p>
            </div>
            <div className="flex justify-center gap-6">
              {previousWinners.winners.map((winner, index) => (
                <div key={winner.user._id} className="flex flex-col items-center text-center">
                  <div className="relative">
                    {/* Rank-based styling for the crown and ring */}
                    {index === 0 && (
                      <FaCrown
                        className="absolute -top-3 left-2/3 -translate-x-1/2 -translate-y-1/2 rotate-12 text-amber-400 drop-shadow-md"
                        size={32}
                      />
                    )}
                    <Link to={`/profile/${winner.user.username}`} className="block">
                      <div
                        className={`avatar transition-transform duration-200 hover:scale-105 ${
                          index === 0
                            ? "ring-4 ring-amber-400"
                            : index === 1
                              ? "ring-4 ring-slate-400"
                              : "ring-4 ring-yellow-800"
                        } w-12 rounded-full ring-offset-2 ring-offset-base-100`}
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
        )}

      {/* Leaderboard Type Indicator */}
      {
        <div className="mb-4 text-center">
          {leaderboardType === "monthly" && (
            <div className="mt-2 text-sm text-base-content/70">
              Resets every month • Current: {currentMonthName}
            </div>
          )}
        </div>
      }

      <ul className="space-y-4">
        {leaderboard.map((entry, index) => {
          const globalRank = (page - 1) * 10 + index + 1

          return (
            <li
              key={entry._id}
              className={`flex flex-col items-start rounded-lg p-3 md:flex-row md:items-center md:gap-0 ${getRankColor(
                globalRank,
              )} relative border border-accent shadow-lg transition-transform duration-200 ease-in-out ${
                currentUser && currentUser._id === entry._id ? "scale-[1.05]" : ""
              } `}
            >
              <div className="flex w-full items-center md:w-auto">
                <span className={`mr-4 text-center text-lg font-bold md:w-10`}>{globalRank}.</span>
                <Link to={`/profile/${entry?.username}`} className="mr-3 flex-shrink-0">
                  <div className="avatar">
                    <div
                      className={`${getRankColor(
                        globalRank,
                      )} w-10 rounded-full ring ring-offset-2 ring-offset-base-100 md:w-12`}
                    >
                      <img
                        src={
                          entry?.profileImg?.imageUrl
                            ? entry.profileImg.imageUrl
                            : "/avatar-placeholder.png"
                        }
                        alt={`${entry.fullName} avatar`}
                      />
                    </div>
                    {globalRank === 1 && (
                      <FaCrown
                        className="absolute -top-[26px] z-50 translate-x-1/2 rotate-[20deg] text-amber-400 md:translate-x-2/3"
                        size={30}
                      />
                    )}
                  </div>
                </Link>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/profile/${entry.username}`}
                      className={`text-md truncate font-bold hover:underline md:text-lg`}
                    >
                      {entry.fullName}
                    </Link>

                    <span className="flex items-center">
                      {renderHourBadge(entry.badges)}
                      {renderSessionBadge(entry.badges)}
                      {renderStreakBadge(entry.badges)}
                    </span>

                    {leaderboardType === "total" && entry.studyStreak >= 3 && (
                      <div className="order-1 flex items-center gap-1 text-sm font-semibold text-orange-400 md:order-none md:ml-auto">
                        <FaFire className="text-xl" />
                        <span>{entry.studyStreak}</span>
                      </div>
                    )}
                    {leaderboardType === "monthly" && entry.monthlyStats.studyStreak >= 3 && (
                      <div className="order-1 flex items-center gap-1 text-sm font-semibold text-orange-400 md:order-none md:ml-auto">
                        <FaFire className="text-xl" />
                        <span>{entry.monthlyStats.studyStreak}</span>
                      </div>
                    )}
                  </div>
                  <p className={`truncate text-sm text-slate-500`}>Level {entry.pomodoroLevel}</p>
                  <span className="flex"></span>
                </div>
              </div>

              <div className="flex w-full flex-wrap items-center justify-between md:ml-auto md:w-auto md:flex-col md:flex-nowrap md:justify-end">
                <div
                  className={`order-2 ml-0 mt-2 flex items-center gap-1 text-sm font-semibold text-slate-300 md:order-none md:ml-4 md:mt-0`}
                >
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

export default StudyLeaderboard
