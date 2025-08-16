import { useState } from "react"
import { useAuthUser } from "../hooks/authHooks/useAuthUser"
import { useGetLeaderboard } from "../hooks/pomodoroHooks/usePomodo"
import { Link, useNavigate } from "react-router-dom"
import { FaArrowLeft, FaClock, FaFire } from "react-icons/fa6"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import { FaCheckCircle } from "react-icons/fa"
import { renderHourBadge, renderSessionBadge } from "../utils/renderBadges"

const badges = [
  "twentyfive-hour-scholar",
  "centurion-scholar",
  "three-hundred-hour-master",
  "ten-sessions-achiever",
  "fifty-sessions-pro",
  "session-master",
]


function StudyLeaderboard() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { leaderboard, totalPages, isLoading } = useGetLeaderboard(page)

  const { authUser: currentUser } = useAuthUser()

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
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

  if (isLoading) {
    return (
      <div className="ring- flex h-screen items-center justify-center p-6">
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
      <ul className="space-y-4">
        {leaderboard.map((entry, index) => {
          const globalRank = (page - 1) * 10 + index + 1

          return (
            <li
              key={entry._id}
              className={`flex flex-col items-start rounded-lg p-3 md:flex-row md:items-center md:gap-0 ${getRankColor(
                globalRank,
              )} relative border border-accent shadow-lg transition-transform duration-200 ease-in-out ${
                currentUser && currentUser._id === entry._id ? "scale-[1.01] bg-secondary" : ""
              } `}
            >
              <div className="flex w-full items-center md:w-auto">
                <span className={`mr-4 text-center text-lg font-bold md:w-10`}>{globalRank}.</span>
                <Link to={`/profile/${entry?.username}`} className="mr-3 flex-shrink-0">
                  <div className="avatar">
                    <div
                      className={`${getRankColor(globalRank)} w-10 rounded-full ring ring-offset-2 ring-offset-base-100 md:w-12`}
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

                    <span className="flex gap-1">
                      {renderHourBadge(entry.badges)}
                      {renderSessionBadge(entry.badges)}
                    </span>
                    {entry.studyStreak >= 3 && (
                      <div className="order-1 flex items-center gap-1 text-sm font-semibold text-orange-400 md:order-none md:ml-auto">
                        <FaFire className="text-xl" />
                        <span>{entry.studyStreak}</span>
                      </div>
                    )}
                  </div>
                  <p className={`truncate text-sm text-slate-500`}>Level {entry.pomodoroLevel}</p>
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
