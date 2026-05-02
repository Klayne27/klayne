import { useNavigate } from "react-router-dom"
import { IoArrowBack } from "react-icons/io5"
import { FaHashtag } from "react-icons/fa"
import { useGetTrendingHashtags } from "../features/hashtag/useHashtagQueries"
import LoadingSpinner from "../components/common/LoadingSpinner"

// Request more hashtags on this page than the panel shows
const FULL_PAGE_LIMIT = 25

const TrendingPage = () => {
  const navigate = useNavigate()
  const { data: tags, isLoading, isError } = useGetTrendingHashtags(FULL_PAGE_LIMIT)

  return (
    <div className="min-h-screen w-full border-accent md:border-x">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-accent bg-base-100/80 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-secondary/40"
        >
          <IoArrowBack size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold leading-tight">Trending</h1>
          <p className="text-xs text-slate-500">What's happening right now</p>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="md" />
        </div>
      )}

      {isError && (
        <div className="py-16 text-center text-sm text-slate-500">
          Something went wrong. Please try again.
        </div>
      )}

      {!isLoading && tags?.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-lg font-semibold">Nothing trending yet</p>
          <p className="mt-1 text-sm text-slate-500">Start posting with hashtags!</p>
        </div>
      )}

      <div className="divide-y divide-accent">
        {tags?.map((item, i) => (
          <button
            key={item.tag}
            onClick={() => navigate(`/hashtag/${item.tag}`)}
            className="group flex w-full items-center gap-4 px-4 py-4 transition hover:bg-secondary/20"
          >
            {/* Rank */}
            <span className="w-6 shrink-0 text-right text-sm font-semibold text-slate-500">
              {i + 1}
            </span>

            {/* Hash icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <FaHashtag size={16} className="text-primary" />
            </div>

            {/* Tag info */}
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate font-bold group-hover:underline">#{item.tag}</p>
              <p className="text-sm text-slate-500">
                {item.count.toLocaleString()} {item.count === 1 ? "post" : "posts"}
              </p>
            </div>

            {/* Arrow */}
            <span className="shrink-0 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default TrendingPage
