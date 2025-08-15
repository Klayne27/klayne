import { Link, useNavigate } from "react-router-dom"
import { useGetStudyActivityFeed } from "../hooks/pomodoroHooks/usePomodo"
import { FaArrowLeft, FaClock } from "react-icons/fa6"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import { useState } from "react"
import { FaCheckCircle } from "react-icons/fa"

const StudyActivityPage = () => {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { activityFeed, isLoading, totalPages } = useGetStudyActivityFeed(page)

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
      <div className="flex h-screen items-center justify-center p-6">
        <LoadingSpinner />
      </div>
    )
  }
  if (!activityFeed || activityFeed.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-4 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-2 flex flex-shrink-0 items-center gap-6 rounded-full p-2.5 transition duration-200 hover:bg-gray-800"
          >
            <FaArrowLeft className="text-xl" />
          </button>
          <h2 className="text-center text-2xl font-bold">Study Activity Feed</h2>
        </div>
        <div className="mt-8 flex items-center justify-center text-gray-500">
          No study sessions to show yet.
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <div className="mb-6 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 flex-shrink-0 rounded-full p-2.5 transition duration-200 hover:bg-gray-800"
        >
          <FaArrowLeft className="text-xl" />
        </button>
        <h2 className="flex-1 text-center text-2xl font-bold">Study Activity Feed</h2>
      </div>
      <div className="space-y-4">
        {activityFeed.map((session) => (
          <div
            key={session._id}
            className="card bg-base-200/70 p-5 shadow-lg transition-transform duration-200 hover:scale-[1.01] hover:bg-base-200"
          >
            <div className="flex items-center space-x-4">
              <Link to={`/profile/${session.user.username}`} className="avatar">
                <div className="w-12 rounded-full">
                  <img
                    src={session.user.profileImg?.imageUrl || "/avatar-placeholder.png"}
                    alt={`${session.user.username}'s profile`}
                  />
                </div>
              </Link>
              <div className="flex-1">
                <div
                  className="text-lg font-bold"
                >
                  {session.user.fullName}
                </div>
                <div className="text-sm text-gray-500"> @{session.user.username}</div>
              </div>
              <div className="flex flex-col items-end text-right text-sm">
                <div className="flex items-center gap-1 font-bold text-success">
                  <FaCheckCircle /> <span>Completed</span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-slate-500">
                  <FaClock /> <span>{session.duration} min</span>
                </div>
              </div>
            </div>
            <div className="mt-4 border-t border-gray-700 pt-3 text-right text-xs text-gray-400">
              <span className="font-semibold">Session on: </span>
              {new Date(session.date).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
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

export default StudyActivityPage
