import { Link, useNavigate } from "react-router-dom"
import { useGetStudyActivityFeed } from "../hooks/pomodoroHooks/usePomodo"
import { FaArrowLeft, FaClock, FaFire } from "react-icons/fa6"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import { useState } from "react"
import { FaArrowUp, FaCheckCircle } from "react-icons/fa"
import { formatTime } from "../utils/date"
import { renderHourBadge, renderSessionBadge, renderStreakBadge } from "../utils/renderBadges"

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const options = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }
  return date.toLocaleString("en-US", options)
}

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
  const maxButtons = 5

  // Show the first page button if totalPages > 1
  if (totalPages > 1) {
    buttons.push(
      <button
        key={1}
        className={`btn join-item ${page === 1 ? "btn-active" : ""}`}
        onClick={() => handlePageChange(1)}
      >
        1
      </button>,
    )
  }

  // Add "..." if we're not near the beginning
  if (page > 3 && totalPages > maxButtons) {
    buttons.push(
      <button key="dots-start" className="btn join-item pointer-events-none">
        ...
      </button>,
    )
  }

  // Determine the range of pages to show
  let startPage = Math.max(2, page - 1)
  let endPage = Math.min(totalPages - 1, page + 1)

  // If we have less than maxButtons, expand the range
  const visibleButtons = endPage - startPage + 1
  if (visibleButtons < maxButtons - 2) {
    if (startPage === 2) {
      endPage = Math.min(totalPages - 1, endPage + (maxButtons - 2 - visibleButtons))
    } else if (endPage === totalPages - 1) {
      startPage = Math.max(2, startPage - (maxButtons - 2 - visibleButtons))
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
  if (page < totalPages - 2 && totalPages > maxButtons) {
    buttons.push(
      <button key="dots-end" className="btn join-item pointer-events-none">
        ...
      </button>,
    )
  }

  // Show the last page button if there are more than `maxButtons`
  if (
    totalPages > 1 &&
    totalPages !== 1 &&
    totalPages > maxButtons - 2 &&
    page < totalPages - Math.floor(maxButtons / 2)
  ) {
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
      <div className="container mx-auto max-w-2xl p-6">
        <div className="mb-4 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-2 flex flex-shrink-0 items-center gap-6 rounded-full p-2.5 transition duration-200 hover:bg-gray-800 hover:text-white"
          >
            <FaArrowLeft className="text-xl" />
          </button>
          <h2 className="flex-1 text-center text-2xl font-bold">Study Activity Feed</h2>
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
          className="mr-4 flex-shrink-0 rounded-full p-2.5 transition duration-200 hover:bg-gray-800 hover:text-white"
        >
          <FaArrowLeft className="text-xl" />
        </button>
        <h2 className="flex-1 text-center text-2xl font-bold">Activity Feed</h2>
      </div>
      <div className="space-y-4">
        {activityFeed.map((activity) => (
          <div
            key={activity._id}
            className="card bg-base-200/70 p-5 shadow-lg transition-transform duration-200"
          >
            <div className="flex items-center space-x-4">
              <Link to={`/profile/${activity.user.username}`} className="avatar">
                <div className="w-12 rounded-full">
                  <img
                    src={activity.user.profileImg?.imageUrl || "/avatar-placeholder.png"}
                    alt={`${activity.user.username}'s profile`}
                  />
                </div>
              </Link>
              <div className="flex-1">
                <Link
                  to={`/profile/${activity.user.username}`}
                  className="text-lg font-bold hover:underline"
                >
                  {activity.user.fullName}
                </Link>
                <div className="text-sm text-gray-500"> @{activity.user.username}</div>
              </div>
              {activity.duration ? (
                // Render Study Session card content
                <div className="flex flex-col items-end text-right text-sm">
                  <div className="flex items-center gap-1 font-bold text-success">
                    <FaCheckCircle /> <span>Completed</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-slate-500">
                    {
                      <>
                        <p>{activity.duration >= 60 && <FaFire className="text-orange-400" />}</p>
                        <FaClock /> <span>{activity.duration} min</span>
                      </>
                    }
                  </div>
                </div>
              ) : (
                // Render Level-Up card content
                <div className="flex flex-col items-end text-right text-sm">
                  <div className="flex items-center gap-1 font-bold text-primary">
                    <FaArrowUp /> <span>Leveled Up!</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-slate-500">
                    Level {activity.newLevel}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-accent pt-3 text-xs text-gray-400">
              <span className="flex justify-between font-semibold">
                <span className="flex">
                  {renderHourBadge(activity.user.badges)}
                  {renderSessionBadge(activity.user.badges)}
                  {renderStreakBadge(activity.user.badges)}
                </span>
                {activity.duration ? "Session on: " : "Achieved on: "}
                {formatTime(activity?.date || activity?.createdAt)} •{" "}
                {formatDate(activity?.date || activity?.createdAt)}
              </span>
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
