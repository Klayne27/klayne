import { Link, useNavigate } from "react-router-dom"
import { FaArrowLeft, FaClock, FaFire, FaArrowUp } from "react-icons/fa6"
import LoadingSpinner from "../components/common/LoadingSpinner"
import { useState } from "react"
import { formatTime } from "../utils/date"
import { getBadgeIcon } from "../utils/badgeUtils.jsx"
import { getOptimizedImageUrl } from "../utils/cloudinaryUtils.js"
import { useGetStudyActivityFeed } from "../features/pomodoro/pomodoroHooks/usePomodoroQueries.js"
import UserAvatar from "../components/common/UserAvatar" // Assuming you have this from earlier
import { FaCheckCircle } from "react-icons/fa"
import { shouldTextBeWhite } from "../utils/shouldTextBeWhite.js"
import { useTheme } from "../context/ThemeContext.jsx"
import { ActivityFeedSkeleton } from "../components/skeletons/ActivityFeedSkeletons.jsx"

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const StudyActivityPage = () => {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { activityFeed, isLoading, totalPages } = useGetStudyActivityFeed(page)

  const {theme} = useTheme()

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

if (isLoading) {
  return (
    <div className="min-h-screen pb-20">
      {/* Skeleton Header */}
      <div className="sticky top-0 z-30 flex items-center gap-4 border-b border-accent/20 bg-base-100/80 px-4 py-3 backdrop-blur-md">
        <div className="skeleton size-9 rounded-full"></div>
        <div className="space-y-2">
          <div className="skeleton h-5 w-32"></div>
          <div className="skeleton h-2 w-16"></div>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl p-4">
        <div className="space-y-3">
          {/* Render 6 skeletons to fill the screen */}
          {[...Array(6)].map((_, i) => (
            <ActivityFeedSkeleton key={i} />
          ))}
        </div>

        {/* Skeleton Pagination */}
        <div className="mt-10 flex justify-center">
          <div className="skeleton h-12 w-64 rounded-xl"></div>
        </div>
      </div>
    </div>
  )
}
  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 mx-auto flex items-center gap-4 border-b border-accent/20 bg-base-100/80 px-4 py-3 backdrop-blur-md">
        <button
          onClick={() => navigate(-1)}
          className="mr-2 flex flex-shrink-0 items-center gap-6 rounded-full p-2.5 transition duration-200 hover:bg-secondary"
        >
          <FaArrowLeft className="text-xl" />
        </button>
        <h2 className="ml-2 flex-1 text-center text-2xl font-bold">Study Activity</h2>
      </div>

      <div className="container mx-auto max-w-2xl p-4">
        {!activityFeed || activityFeed.length === 0 ? (
          <div className="mt-20 text-center text-slate-500">No study sessions recorded yet.</div>
        ) : (
          <div className="space-y-3">
            {activityFeed.map((activity) => {
              const isLevelUp = !activity.duration

              return (
                <div
                  key={activity._id}
                  className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                    isLevelUp
                      ? "border-primary/30 bg-primary/5 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                      : "border-accent/10 bg-base-200/40 hover:bg-base-200/60"
                  }`}
                >
                  <div className="flex items-center p-4">
                    {/* User Info Section */}
                    <div className="relative mr-4">
                      <Link to={`/profile/${activity.user.username}`}>
                        <UserAvatar user={activity.user} size="md" />
                      </Link>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/profile/${activity.user.username}`}
                          className="truncate font-bold hover:underline"
                          style={
                            activity.user.nameColor ? { color: activity.user.nameColor } : undefined
                          }
                        >
                          {activity.user.fullName}
                        </Link>
                        {activity.user.preferredBadge && (
                          <span className="size-4 opacity-80">
                            {getBadgeIcon(activity.user.preferredBadge)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Level {isLevelUp ? activity.newLevel - 1 : activity.user.pomodoroLevel}
                      </p>
                    </div>

                    {/* Action Section */}
                    <div className="text-right">
                      {isLevelUp ? (
                        <div className="flex flex-col items-end">
                          <div className="flex animate-pulse items-center gap-1 font-black text-primary">
                            <FaArrowUp size={12} />
                            <span className="text-xs uppercase tracking-tighter">Level Up</span>
                          </div>
                          <span className="text-2xl font-black text-primary">
                            {activity.newLevel}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1 text-xs font-bold text-success">
                            <FaCheckCircle size={10} />
                            <span>SESSION</span>
                          </div>
                          <div className="flex items-center gap-1 text-xl font-black">
                            {activity.duration >= 60 && (
                              <FaFire className="text-sm text-orange-500" />
                            )}
                            <span>{activity.duration}</span>
                            <span className="text-[10px] font-bold text-slate-500">min</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer / Timestamp */}
                  <div
                    className={`flex justify-between border-t px-4 py-2 text-[10px] font-medium ${
                      isLevelUp ? "border-primary/10 bg-primary/5" : "border-accent/5 bg-black/5"
                    } text-slate-500`}
                  >
                    <span>{formatTime(activity?.date || activity?.createdAt)}</span>
                    <span>{formatDate(activity?.date || activity?.createdAt)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Improved Pagination */}
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
    </div>
  )
}

export default StudyActivityPage
