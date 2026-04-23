import { useState } from "react"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import { Link, useNavigate } from "react-router-dom"
import { FaArrowLeft, FaClock, FaTrophy, FaCalendar, FaCrown } from "react-icons/fa6"
import { FaFire } from "react-icons/fa"
import { FaCheckCircle } from "react-icons/fa"
import LoadingSpinner from "../components/common/LoadingSpinner"

import { getBadgeIcon } from "../utils/badgeUtils.jsx"
import { getOptimizedImageUrl } from "../utils/cloudinaryUtils.js"
import {
  useGetMonthlyLeaderboard,
  useGetPreviousMonthWinners,
  useGetPreviousWeekWinners,
  useGetTotalLeaderboard,
  useGetWeeklyLeaderboard,
} from "../features/pomodoro/pomodoroHooks/usePomodoroQueries.js"
import UserAvatar from "../components/common/UserAvatar.jsx"
import UserFullName from "../components/common/UserFullname.jsx"
import { getNameplateClass } from "../utils/getNameplateClass.js"

const WinnerAvatar = ({ winner, rank, size, ringColor }) => (
  <Link
    to={`/profile/${winner?.user?.username}`}
    className="group relative transition-transform hover:scale-110"
  >
    <div className={`avatar ${ringColor} rounded-full ring ring-offset-2 ring-offset-base-100`}>
      <div className={`${size} rounded-full`}>
        <img
          src={getOptimizedImageUrl(
            winner?.user?.profileImg?.imageUrl || "/avatar-placeholder.png",
            "avatar",
          )}
          alt={winner?.user?.fullName}
        />
      </div>
    </div>
    {/* Rank Badge */}
    <div
      className={`absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-base-100 text-[10px] font-bold text-white shadow-sm ${rank === 1 ? "bg-amber-500" : rank === 2 ? "bg-slate-500" : "bg-yellow-800"}`}
    >
      {rank}
    </div>
  </Link>
)

function StudyLeaderboardPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [leaderboardType, setLeaderboardType] = useState("total")
  const [showPreviousWinners, setShowPreviousWinners] = useState(true)

  const { authUser: currentUser } = useAuthUser()

  const totalLeaderboard = useGetTotalLeaderboard(page, { enabled: leaderboardType === "total" })
  const monthlyLeaderboard = useGetMonthlyLeaderboard(page, {
    enabled: leaderboardType === "monthly",
  })
  const weeklyLeaderboard = useGetWeeklyLeaderboard(page, { enabled: leaderboardType === "weekly" })

  const { previousMonthWinners } = useGetPreviousMonthWinners()
  const { previousWeekWinners } = useGetPreviousWeekWinners()
  

  const currentLeaderboard =
    leaderboardType === "total"
      ? totalLeaderboard
      : leaderboardType === "monthly"
        ? monthlyLeaderboard
        : weeklyLeaderboard

  const { leaderboard, totalPages, isLoading, currentWeekStart } = currentLeaderboard

  // const handlePageChange = (newPage) => {
  //   if (newPage >= 1 && newPage <= totalPages) setPage(newPage)
  // }
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
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
      <div className="template container mx-auto max-w-2xl p-4">
        <div className="mb-6 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-2 flex flex-shrink-0 items-center gap-6 rounded-full p-2.5 transition duration-200 hover:bg-secondary"
          >
            <FaArrowLeft className="text-xl" />
          </button>
          <h2 className="ml-2 flex-1 text-center text-2xl font-bold">Study Leaderboard</h2>
        </div>

        {/* Type tabs — shown even on empty state so user can switch */}
        <div className="mb-6 flex border-b border-gray-700">
          {["total", "weekly", "monthly"].map((type) => (
            <button
              key={type}
              onClick={() => handleLeaderboardTypeChange(type)}
              className={`relative flex-1 pb-3 text-sm font-bold transition-colors ${
                leaderboardType === type ? "text-primary" : "text-gray-500"
              }`}
            >
              {type === "total" ? "All Time" : type === "weekly" ? "Weekly" : "Monthly"}
              {leaderboardType === type && (
                <div className="absolute bottom-0 left-0 right-0 h-1 rounded-t-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center text-gray-500">
          No study data available for this period yet.
        </div>
      </div>
    )
  }

  // Updated renderer with a "Podium" feel
  const renderWinnersPanel = (winnersData, label) => {
    const winnersArray = winnersData?.winners || []
    if (winnersArray.length === 0) return null

    const getWinnerByRank = (index) => winnersArray[index] || null

    // Helper to render the name/time block to avoid repetition
    const WinnerStats = (winner) => {
      if (!winner) return <div className="flex-1 opacity-0" /> // Spacer for missing ranks
      return (
        <div className="min-w-0 flex-1 px-1">
          <p>
            <UserFullName
              user={winner.user}
              className={`truncate text-[11px] font-bold text-base-content sm:text-xs`}
              style={winner.user?.nameColor ? { color: winner.user?.nameColor } : undefined}
            />
          </p>
          <p className="flex items-center justify-center gap-1 text-[10px] font-medium text-primary">
            <FaClock className="text-[9px]" />
            <span>
              {Math.floor((winner.studyDuration || 0) / 60)}h {(winner.studyDuration || 0) % 60}m
            </span>
          </p>
        </div>
      )
    }

    return (
      <div className="mb-8 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/20 to-base-100 p-1 shadow-xl">
        <div className="rounded-[calc(1rem-1px)] bg-base-100 px-10 py-5 md:px-28">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              <FaTrophy className="text-sm" /> Hall of Fame
            </div>
            <h3 className="mt-2 text-xl font-black text-base-content">{label}</h3>
          </div>

          {/* Podium Layout */}
          <div className="flex items-end justify-center gap-2 sm:gap-6">
            {/* 2nd Place */}
            <div className="flex flex-1 flex-col items-center">
              <WinnerAvatar
                winner={getWinnerByRank(1)}
                rank={2}
                size="w-14 sm:w-16"
                ringColor="ring-slate-400"
              />
              <div className="mt-3 h-16 w-full max-w-[80px] rounded-t-lg bg-gradient-to-b from-slate-300 to-transparent p-2 text-center">
                <span className="text-lg font-black text-slate-600">2nd</span>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-1 flex-col items-center">
              <div className="relative mb-2">
                <FaCrown
                  className="absolute -top-7 left-1/2 -translate-x-1/2 rotate-[-5deg] text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                  size={32}
                />
                <WinnerAvatar
                  winner={getWinnerByRank(0)}
                  rank={1}
                  size="w-20 sm:w-24"
                  ringColor="ring-amber-400"
                />
              </div>
              <div className="h-24 w-full max-w-[100px] rounded-t-lg bg-gradient-to-b from-amber-400 to-transparent p-2 text-center shadow-lg">
                <span className="text-2xl font-black text-amber-700">1st</span>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-1 flex-col items-center">
              <WinnerAvatar
                winner={getWinnerByRank(2)}
                rank={3}
                size="w-14 sm:w-16"
                ringColor="ring-yellow-800"
              />
              <div className="mt-3 h-12 w-full max-w-[80px] rounded-t-lg bg-gradient-to-b from-yellow-700/50 to-transparent p-2 text-center">
                <span className="text-lg font-black text-yellow-900">3rd</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-between gap-2 border-t border-base-200 pt-4 text-center sm:gap-6">
            {WinnerStats(getWinnerByRank(1))}
            {WinnerStats(getWinnerByRank(0))}
            {WinnerStats(getWinnerByRank(2))}
          </div>
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
          className="mr-4 flex-shrink-0 rounded-full p-2.5 transition duration-200 hover:bg-secondary"
        >
          <FaArrowLeft className="text-xl" />
        </button>
        <h2 className="flex-1 text-center text-2xl font-bold">Study Leaderboard</h2>
      </div>

      {/* Type tabs */}
      <div className="mb-6 flex border-b border-gray-700">
        {["total", "weekly", "monthly"].map((type) => (
          <button
            key={type}
            onClick={() => handleLeaderboardTypeChange(type)}
            className={`relative flex-1 pb-3 text-sm font-bold transition-colors ${
              leaderboardType === type ? "text-primary" : "text-gray-500"
            }`}
          >
            {type === "total" ? "All Time" : type === "weekly" ? "Weekly" : "Monthly"}
            {leaderboardType === type && (
              <div className="absolute bottom-0 left-0 right-0 h-1 rounded-t-full bg-primary" />
            )}
          </button>
        ))}
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
        renderWinnersPanel(previousMonthWinners, `Top 3 for ${previousMonthWinners?.month}`)}

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
      <ul className="space-y-3">
        {leaderboard.map((entry, index) => {
          const globalRank = (page - 1) * 10 + index + 1
          const isMe = currentUser && currentUser._id === entry._id
          const nameplateClass = getNameplateClass(entry?.equipped?.nameplate)
          
          return (
            <li
              key={entry._id}
              className={`relative ${nameplateClass} overflow-hidden flex items-center justify-between rounded-2xl border p-3 transition-all duration-300 sm:p-4 ${isMe ? "z-10 scale-[1.02] border-primary bg-primary/5 shadow-md" : "border-base-300 bg-base-100 hover:border-gray-400"} `}
            >
              {/* LEFT SIDE: Rank, Avatar, and Info */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {/* 1. Dedicated Rank Column */}
                <div className="flex w-6 flex-shrink-0 items-center justify-center sm:w-8">
                  <span
                    className={`text-lg font-black italic sm:text-xl ${getRankIndexColor(globalRank)} ${globalRank > 3 ? "opacity-30" : "opacity-100"}`}
                  >
                    {globalRank}
                  </span>
                </div>

                {/* 2. Avatar with Crown */}
                <Link to={`/profile/${entry?.username}`} className="relative flex-shrink-0">
                  <div className={` ${globalRank <= 3 ? "p-0.5" : ""}`}>
                    {/* <div
                      className={`w-10 rounded-full ring-offset-2 ring-offset-base-100 sm:w-12 ${
                        globalRank === 1
                          ? "ring-2 ring-amber-400"
                          : globalRank === 2
                            ? "ring-2 ring-slate-400"
                            : globalRank === 3
                              ? "ring-2 ring-yellow-700"
                              : "ring-1 ring-base-300"
                      }`}
                    > */}
                    {/* <img
                        src={getOptimizedImageUrl(
                          entry?.profileImg?.imageUrl || "/avatar-placeholder.png",
                          "avatar",
                        )}
                        alt={entry.fullName}
                        className="rounded-full"
                      /> */}
                    <UserAvatar user={entry} size={"md"} />
                    {/* </div> */}
                  </div>
                  {globalRank === 1 && (
                    <FaCrown
                      className="absolute -right-1 -top-4 rotate-[24deg] text-amber-400 drop-shadow-md"
                      size={27}
                    />
                  )}
                </Link>

                {/* 3. Name and Level */}
                <div className="flex min-w-0 flex-col overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <Link to={`/profile/${entry.username}`}>
                      <UserFullName
                        user={entry}
                        className={`truncate text-sm font-bold transition-colors hover:text-primary sm:text-base`}
                        style={entry.nameColor ? { color: entry.nameColor } : undefined}
                      />
                    </Link>
                    {entry.preferredBadge && (
                      <span className="size-3.5 flex-shrink-0">
                        {getBadgeIcon(entry.preferredBadge)}
                      </span>
                    )}
                    {isMe && (
                      <span className="badge badge-primary badge-xs px-1 text-[9px] font-bold">
                        YOU
                      </span>
                    )}
                  </div>

                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="rounded bg-slate-200/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-slate-500 dark:bg-slate-800">
                      Lvl {entry.pomodoroLevel}
                    </span>
                    {(leaderboardType === "total" ? entry.studyStreak : entry.monthlyStudyStreak) >=
                      3 && (
                      <div
                        className={`flex items-center gap-0.5 text-[11px] font-bold ${getFireColor(leaderboardType === "total" ? entry.studyStreak : entry.monthlyStudyStreak)}`}
                      >
                        <FaFire />
                        <span>
                          {leaderboardType === "total"
                            ? entry.studyStreak
                            : entry.monthlyStudyStreak}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE: Stats Section */}
              <div className="ml-3 flex flex-shrink-0 flex-col items-end border-l border-base-200 pl-3 sm:pl-4">
                <div className="flex items-center gap-1 text-primary">
                  <FaClock className="text-[10px] sm:text-xs" />
                  <span className="whitespace-nowrap text-xs font-black tabular-nums sm:text-sm">
                    {Math.floor(entry.totalStudyDuration / 60)}h {entry.totalStudyDuration % 60}m
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-medium text-base-content/60 sm:text-[11px]">
                  <FaCheckCircle className="text-[9px]" />
                  <span className="whitespace-nowrap">{entry.totalSessionsCompleted} sess.</span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {totalPages > 1 && (
        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Navigation Group */}
            <div className="flex items-center gap-1 rounded-2xl border border-accent/10 bg-base-200/50 p-1.5 shadow-xl backdrop-blur-md">
              {/* Skip to First */}
              <button
                className="btn btn-ghost btn-sm rounded-xl px-2 text-slate-500 disabled:opacity-30"
                onClick={() => handlePageChange(1)}
                disabled={page === 1}
                title="First Page"
              >
                <span className="text-lg">«</span>
              </button>

              {/* Prev Page */}
              <button
                className="btn btn-ghost btn-sm rounded-xl px-2 text-slate-500 disabled:opacity-30"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                ‹
              </button>

              {/* Sliding Window Page Numbers */}
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (page <= 2) return p <= 3
                    if (page >= totalPages - 1) return p >= totalPages - 2
                    return p >= page - 1 && p <= page + 1
                  })
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`h-9 w-9 rounded-xl text-xs font-bold transition-all duration-300 ${
                        p === page
                          ? `scale-105 bg-primary text-white shadow-lg shadow-primary/40`
                          : "text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
              </div>

              {/* NEXT & LAST Group */}
              <button
                className="btn btn-ghost btn-sm rounded-xl px-2 text-slate-500 disabled:opacity-30"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
              >
                ›
              </button>

              {/* Skip to Last */}
              <button
                className="btn btn-ghost btn-sm rounded-xl px-2 text-slate-500 disabled:opacity-30"
                onClick={() => handlePageChange(totalPages)}
                disabled={page === totalPages}
                title="Last Page"
              >
                <span className="text-lg">»</span>
              </button>
            </div>

            {/* Jump to Page Input - Positioned in between or adjacent */}
            <div className="flex items-center gap-2 rounded-2xl border border-accent/10 bg-base-200/50 px-4 py-2 shadow-lg backdrop-blur-md">
              <label
                htmlFor="jump-to"
                className="text-[10px] font-black uppercase tracking-tighter text-slate-500"
              >
                Page
              </label>
              <input
                id="jump-to"
                type="number"
                min="1"
                max={totalPages}
                placeholder={page}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = parseInt(e.target.value)
                    if (val >= 1 && val <= totalPages) {
                      handlePageChange(val)
                      e.target.value = ""
                      e.target.blur()
                    }
                  }
                }}
                className="w-10 bg-transparent text-center text-sm font-black text-primary placeholder:text-slate-600 focus:outline-none"
              />
            </div>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500/50">
            Viewing {page} / {totalPages}
          </p>
        </div>
      )}
    </div>
  )
}

export default StudyLeaderboardPage
