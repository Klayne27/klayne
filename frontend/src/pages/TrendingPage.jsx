import { useNavigate } from "react-router-dom"
import { IoArrowBack } from "react-icons/io5"
import { useGetTrendingHashtags } from "../features/hashtag/useHashtagQueries"
import LoadingSpinner from "../components/common/LoadingSpinner"

const FULL_PAGE_LIMIT = 25

/**
 * `mobile` prop – when true (set by ConnectPage) the sticky back-button
 * header is suppressed because ConnectPage owns the shared header.
 */
const TrendingPage = ({ mobile = false }) => {
  const navigate = useNavigate()
  const { data: tags, isLoading, isError } = useGetTrendingHashtags(FULL_PAGE_LIMIT)

  return (
    <div className="min-h-screen w-full border-accent md:border-r">
      {/* Header – hidden when rendered inside ConnectPage (mobile) */}
      {!mobile && (
        <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-accent bg-base-100/80 px-4 py-3 backdrop-blur">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-secondary/40"
          >
            <IoArrowBack size={20} />
          </button>
          <h1 className="text-xl font-bold leading-tight">Trending</h1>
        </div>
      )}

      <div className="pb-4 pt-4">
        <span className="px-4 text-xl font-bold">What's happening right now</span>
      </div>

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

      <div className="flex flex-col">
        {tags?.map((item) => (
          <button
            key={item.tag}
            onClick={() => navigate(`/hashtag/${item.tag}`)}
            className="group flex w-full flex-col items-start px-4 py-3 transition hover:bg-secondary/30"
          >
            <span className="text-[14px] font-bold text-base-content">#{item.tag}</span>
            <span className="text-[13px] text-slate-500">
              {item.count.toLocaleString()} Post{item.count !== 1 ? "s" : ""}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default TrendingPage
