import { useNavigate } from "react-router-dom"
import { FaHashtag } from "react-icons/fa"
import { useGetTrendingHashtags } from "../../features/hashtag/useHashtagQueries"
import RightPanelSkeleton from "../skeletons/RightPanelSkeleton"

const TrendingTagsPanel = () => {
  const navigate = useNavigate()
  const { data: tags, isLoading } = useGetTrendingHashtags()

  if (isLoading) {
    return (
      <div className="mt-4 rounded-2xl border border-accent py-4">
        <p className="mb-4 px-4 text-xl font-bold">Trending</p>
        <div className="flex flex-col gap-2.5 px-4">
          <RightPanelSkeleton />
          <RightPanelSkeleton />
          <RightPanelSkeleton />
        </div>
      </div>
    )
  }

  if (!tags?.length) return null

  return (
    <div className="mt-4 rounded-2xl border border-accent py-4">
      {/* Consistent Header with SuggestedUsersPanel */}
      <p className="mb-4 px-4 text-xl font-bold">What's happening</p>

      <div className="flex flex-col">
        {tags.map((item, i) => (
          <button
            key={item.tag}
            onClick={() => navigate(`/hashtag/${item.tag}`)}
            className="group flex w-full items-center justify-between px-4 py-3 transition hover:bg-secondary/30"
          >
            <div className="flex min-w-0 items-center gap-3">
              {/* Rank indicator */}
              <span className="w-4 shrink-0 text-sm font-medium text-slate-500">{i + 1}</span>

              <div className="flex min-w-0 flex-col items-start">
                <span className="flex items-center gap-1 font-bold text-base-content group-hover:underline">
                  <FaHashtag size={12} className="shrink-0 text-primary" />
                  <span className="truncate">{item.tag}</span>
                </span>
                <span className="text-xs text-slate-500">{item.count.toLocaleString()} Posts</span>
              </div>
            </div>

            {/* Optional "Trending" badge or Arrow */}
            <div className="flex-shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">
                View
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Consistent Footer Button Style */}
      <button
        onClick={() => navigate("/trending")}
        className="mt-2 flex w-full items-center justify-center py-2 text-sm font-semibold text-primary transition"
      >
        Show more
      </button>
    </div>
  )
}

export default TrendingTagsPanel
