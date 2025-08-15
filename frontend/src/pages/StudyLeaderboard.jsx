import { useState } from "react"
import { useAuthUser } from "../hooks/authHooks/useAuthUser"
import { useGetLeaderboard } from "../hooks/pomodoroHooks/usePomodo"
import { Link, useNavigate } from "react-router-dom"
import { FaArrowLeft, FaClock } from "react-icons/fa6"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import { FaCheckCircle } from "react-icons/fa"

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

    // Show the first page button
    buttons.push(
      <button
        key={1}
        className={`btn join-item ${page === 1 ? "btn-active" : ""}`}
        onClick={() => handlePageChange(1)}
      >
        1
      </button>,
    )

    // Add "..." if we're not near the beginning
    if (page > 3) {
      buttons.push(
        <button key="dots-start" className="btn join-item pointer-events-none">
          ...
        </button>,
      )
    }

    // Show a few buttons around the current page
    let startPage = Math.max(2, page - Math.floor(maxButtons / 2) + 1)
    let endPage = Math.min(totalPages - 1, page + Math.floor(maxButtons / 2) - 1)

    // Adjust start and end to fit maxButtons
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

    // Add "..." if we're not near the end
    if (page < totalPages - 2) {
      buttons.push(
        <button key="dots-end" className="btn join-item pointer-events-none">
          ...
        </button>,
      )
    }

    // Show the last page button if there's more than one page
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
        return "ring-base-100 bg-base-200"
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
            className="mr-2 flex flex-shrink-0 hover:text-white items-center gap-6 rounded-full p-2.5 transition duration-200 hover:bg-gray-800"
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
              className={`flex items-center rounded-lg p-3 ${getRankColor(globalRank)} shadow-lg border border-accent transition-transform duration-200 ease-in-out ${
                currentUser && currentUser._id === entry._id ? "scale-[1.01] bg-secondary" : ""
              } `}
            >
              <span className={`w-10 text-center text-lg font-bold`}>{globalRank}.</span>
              <Link to={`/profile/${entry?.username}`} className="mr-3 flex-shrink-0">
                <div className="avatar">
                  <div
                    className={`${getRankColor(globalRank)} w-12 rounded-full ring ring-offset-2 ring-offset-base-100`}
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
                <div className="flex items-center gap-2">
                  <Link
                    to={`/profile/${entry.username}`}
                    className={`truncate text-lg font-bold hover:underline`}
                  >
                    {entry.fullName}
                  </Link>
                  <p className={`truncate text-sm text-slate-500`}>@{entry.username}</p>
                </div>
                <p className={`truncate text-sm text-slate-500`}>Level {entry.pomodoroLevel}</p>
              </div>
              <div className={`ml-4 flex flex-col items-end text-right text-slate-300`}>
                <div className="flex items-center gap-1">
                  <FaClock className="text-sm" />
                  <span className="text-sm font-semibold">
                    {Math.round(entry.totalStudyDuration / 60)}h {entry.totalStudyDuration % 60}m
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-slate-500">
                  <FaCheckCircle className="text-sm" />
                  <span className="text-sm">{entry.totalSessionsCompleted} sessions</span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {/* Pagination Controls */}
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
