import { useNavigate } from "react-router-dom"
import { useGetPanelTrending, useGetTrendingHashtags } from "../../features/hashtag/useHashtagQueries"
import RightPanelSkeleton from "../skeletons/RightPanelSkeleton"
import { HiDotsHorizontal } from "react-icons/hi" // Closer to X's "more" icon

const TrendingTagsPanel = () => {
  const navigate = useNavigate()
  const { data: tags, isLoading } = useGetPanelTrending() // Use the new hook

  if (isLoading) {
    return (
      <div className="mt-4 rounded-2xl border border-accent pt-4">
        <p className="mb-4 px-4 text-xl font-bold">What's happening</p>
        <div className="mb-4 flex flex-col gap-6 px-4">
          {[...Array(4)].map((_, i) => (
            <RightPanelSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (!tags?.length) return null

  return (
    <div className="mt-4  rounded-2xl border border-accent pt-4">
      <h2 className="mb-3 px-4 text-xl font-bold">What's happening</h2>
      <div className="flex flex-col">
        {tags.map((item) => (
          <button
            key={item.tag}
            onClick={() => navigate(`/hashtag/${item.tag}`)}
            className="group flex w-full flex-col px-4 py-3 transition hover:bg-secondary/20"
          >
            <p className="mt-0.5 text-left text-[15px] font-bold text-base-content">#{item.tag}</p>
            <p className="mt-1 text-left text-[13px] text-slate-500">
              {item.count.toLocaleString()} Posts
            </p>
          </button>
        ))}
      </div>
      <button
        onClick={() => navigate("/trending")}
        className="flex w-full justify-start rounded-b-2xl px-4 py-4 text-[15px] text-primary transition hover:bg-secondary/20"
      >
        Show more
      </button>
    </div>
  )
}

export default TrendingTagsPanel
