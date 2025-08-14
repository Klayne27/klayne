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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="flex items-center justify-center p-6 text-gray-500">
        No study data available to create a leaderboard yet.
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-base-100 p-4 shadow-md">
      <div className="mb-4 flex">
        <button
          onClick={() => navigate(-1)}
          className="mr-2 flex flex-shrink-0 items-center gap-6 rounded-full p-2.5 transition duration-200 hover:bg-gray-800"
        >
          <FaArrowLeft />
        </button>
        <h2 className="text-center text-2xl font-bold">Study Leaderboard</h2>
      </div>
      <ul className="space-y-2">
        {leaderboard.map((entry, index) => (
          <li
            key={entry._id}
            className={`flex transform items-center rounded-lg p-3 shadow-sm transition-transform duration-200 ease-in-out ${
              currentUser && currentUser._id === entry._id
                ? "scale-105 bg-secondary"
                : "bg-base-200/70"
            }`}
          >
            <span className="w-8 text-lg font-bold">{(page - 1) * 10 + index + 1}.</span>
            <Link to={`/profile/${entry?.username}`} className="mr-3 w-10">
              <div className="rounded-full">
                <img
                  className="size-10 rounded-full"
                  src={
                    entry?.profileImg?.imageUrl
                      ? entry.profileImg.imageUrl
                      : "/avatar-placeholder.png"
                  }
                  alt={`${entry.fullName} avatar`}
                />
              </div>
            </Link>
            <div className="flex-1">
              <p
                className={`font-semibold ${
                  currentUser && currentUser.id === entry._id ? "text-primary-content" : ""
                }`}
              >
                {entry.fullName}
              </p>
              <p
                className={`text-sm ${
                  currentUser && currentUser.id === entry._id
                    ? "text-primary-content"
                    : "text-slate-500"
                }`}
              >
                @{entry.username}
              </p>
            </div>
            <div className="flex flex-col items-end text-right text-xs">
              <div className="flex items-center gap-1 font-bold">
                <FaClock className="text-slate-500" />
                <span>
                  {Math.round(entry.totalStudyDuration / 60)}h {entry.totalStudyDuration % 60}m
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-500">
                <FaCheckCircle className="text-secondary" />
                <span>{entry.totalSessionsCompleted} sessions</span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Pagination Controls */}
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
    </div>
  )
}

export default StudyLeaderboard
