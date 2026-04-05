import { FaComment } from "react-icons/fa"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils"
import { formatPostDate } from "../../../utils/date"

const getMostUsedEmojiData = (reactions) => {
  if (!reactions || reactions.length === 0) return { emoji: null, count: 0 }

  const counts = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1
    return acc
  }, {})

  const topEmoji = Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b))

  return {
    emoji: topEmoji,
    count: counts[topEmoji],
  }
}
const BoardPostCard = ({ post, isSelected, onClick }) => {
  const { emoji: topEmoji, count: topEmojiCount } = getMostUsedEmojiData(post.reactions)

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer border-b border-accent px-4 py-3 transition duration-200 hover:bg-gray-700/30 ${
        isSelected ? "border-r-2 border-r-primary bg-primary/10" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <img
          src={getOptimizedImageUrl(post.user?.profileImg?.imageUrl, "avatar")}
          alt={post.user?.username}
          className="mt-0.5 h-8 w-8 flex-shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{post.title}</p>
          {post.content && (
            <p className="mt-0.5 line-clamp-2 text-sm text-slate-400">{post.content}</p>
          )}
          {post?.image && (
            <img
              src={post.image.imageUrl}
              className="mt-2 max-h-48 rounded-xl border border-accent object-contain"
            />
          )}
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
            <span>{post.user?.username}</span>
            <span>·</span>
            <span>{formatPostDate(post.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Footer stats */}
      <div className="mt-2 flex items-center gap-4 pl-11 text-sm text-slate-500">
        <span className="flex items-center gap-1">
          <FaComment size={12} />
          {post.commentsCount || 0}
        </span>
        {topEmoji && (
          <span className="flex items-center gap-1">
            <span>{topEmoji}</span>
            <span>{topEmojiCount}</span>
          </span>
        )}
        {post.tags?.length > 0 && (
          <span className="truncate text-xs text-primary/70">
            {post.tags
              .slice(0, 2)
              .map((t) => `#${t}`)
              .join(" ")}
          </span>
        )}
      </div>
    </div>
  )
}

export default BoardPostCard
