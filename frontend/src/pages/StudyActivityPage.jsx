import { Link, useNavigate } from "react-router-dom"
import { FaArrowLeft, FaClock, FaFire, FaArrowUp } from "react-icons/fa6"
import LoadingSpinner from "../components/common/LoadingSpinner"
import { useState } from "react"
import { formatTime } from "../utils/date"
import { getBadgeIcon } from "../utils/badgeUtils.jsx"
import { useGetStudyActivityFeed } from "../features/pomodoro/pomodoroHooks/usePomodoroQueries.js"
import UserAvatar from "../components/common/UserAvatar"
import { FaCheckCircle } from "react-icons/fa"
import { shouldTextBeWhite } from "../utils/shouldTextBeWhite.js"
import { useTheme } from "../context/ThemeContext.jsx"
import { ActivityFeedSkeleton } from "../components/skeletons/ActivityFeedSkeletons.jsx"
import UserFullName from "../components/common/UserFullname.jsx"
import { getNameplateClass } from "../utils/getNameplateClass.js"

// Import the Live Dashboard component
import LiveDashboard from "../features/pomodoro/components/LiveDashboard"
import { RiRadioButtonLine, RiHistoryLine } from "react-icons/ri"

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const StudyActivityPage = () => {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState("live") // Default to 'live'
  const { activityFeed, isLoading, totalPages } = useGetStudyActivityFeed(page)
  const { theme } = useTheme()

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 mx-auto border-b border-accent/20 bg-base-100/80 backdrop-blur-md">
        <div className="flex items-center gap-4 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex flex-shrink-0 items-center rounded-full p-2.5 transition duration-200 hover:bg-secondary"
          >
            <FaArrowLeft className="text-xl" />
          </button>
          <h2 className="flex-1 text-center text-2xl font-bold">Study Hub</h2>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Tab Navigation */}
        <div className="flex px-4">
          <button
            onClick={() => setActiveTab("live")}
            className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-sm font-black uppercase tracking-widest transition-all ${
              activeTab === "live"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {/* <RiRadioButtonLine className={activeTab === "live" ? "animate-pulse" : ""} /> */}
            Live Now
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-sm font-black uppercase tracking-widest transition-all ${
              activeTab === "history"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {/* <RiHistoryLine /> */}
            History
          </button>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl">
        {activeTab === "live" ? (
          /* Live Dashboard Tab */
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <LiveDashboard />
          </div>
        ) : (
          /* History Tab */
          <div className="animate-in fade-in slide-in-from-bottom-2 p-4 duration-300">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <ActivityFeedSkeleton key={i} />
                ))}
              </div>
            ) : !activityFeed || activityFeed.length === 0 ? (
              <div className="mt-20 text-center text-slate-500">
                No study sessions recorded yet.
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {activityFeed.map((activity) => {
                    const isLevelUp = !activity.duration
                    const nameplateClass = getNameplateClass(activity.user?.equipped?.nameplate)

                    return (
                      <div
                        key={activity._id}
                        className={`group ${nameplateClass} relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                          isLevelUp
                            ? "border-primary/30 bg-primary/5 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                            : "border-accent/10 bg-base-200/40 hover:bg-base-200/60"
                        }`}
                      >
                        {/* ... existing activity card content ... */}
                        <div className="flex items-center p-4">
                          <div className="relative mr-4">
                            <Link to={`/profile/${activity.user.username}`}>
                              <UserAvatar user={activity.user} size="md" />
                            </Link>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <Link to={`/profile/${activity.user.username}`}>
                                <UserFullName
                                  user={activity.user}
                                  className="truncate font-bold hover:underline"
                                  style={
                                    activity.user.nameColor
                                      ? { color: activity.user.nameColor }
                                      : undefined
                                  }
                                />
                              </Link>
                              {activity.user.preferredBadge && (
                                <span className="size-4 opacity-80">
                                  {getBadgeIcon(activity.user.preferredBadge)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">
                              Level{" "}
                              {isLevelUp ? activity.newLevel - 1 : activity.user.pomodoroLevel}
                            </p>
                          </div>
                          <div className="text-right">
                            {/* Action Section (Level up or Session duration) */}
                            {isLevelUp ? (
                              <div className="flex flex-col items-end text-primary">
                                <div className="flex items-center gap-1 text-[10px] font-black uppercase">
                                  <FaArrowUp size={10} /> Level Up
                                </div>
                                <span className="text-2xl font-black">{activity.newLevel}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1 text-[10px] font-black uppercase text-success">
                                  <FaCheckCircle size={10} /> Session
                                </div>
                                <div className="flex items-center gap-1 text-xl font-black">
                                  {activity.duration >= 60 && (
                                    <FaFire className="text-sm text-orange-500" />
                                  )}
                                  <span>{activity.duration}</span>
                                  <span className="text-[10px] text-slate-500">min</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between border-t border-accent/5 bg-black/5 px-4 py-2 text-[10px] font-medium text-slate-500">
                          <span>{formatTime(activity?.date || activity?.createdAt)}</span>
                          <span>{formatDate(activity?.date || activity?.createdAt)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Pagination (Only in History Tab) */}
                {totalPages > 1 && (
                  <div className="mt-10 flex flex-col items-center gap-4">
                    {/* ... your existing pagination UI ... */}
                    <div className="flex items-center gap-1 rounded-2xl border border-accent/10 bg-base-200/50 p-1.5 shadow-xl backdrop-blur-md">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                      >
                        ‹
                      </button>
                      <span className="px-4 text-xs font-bold text-primary">
                        {page} / {totalPages}
                      </span>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                      >
                        ›
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default StudyActivityPage
