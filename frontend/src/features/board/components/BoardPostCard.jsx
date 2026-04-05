import { FaComment } from "react-icons/fa"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils"
import { formatPostDate } from "../../../utils/date"

const getMostUsedEmoji = (reactions) => {
  if (!reactions || reactions.length === 0) return null
  return reactions.reduce((max, r) => (r.users.length > max.users.length ? r : max)).emoji
}

const BoardPostCard = ({ post, isSelected, onClick }) => {
  const topEmoji = getMostUsedEmoji(post.reactions)
  const totalReactions = post.reactions?.reduce((sum, r) => sum + r.users.length, 0) || 0

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
            <span>{totalReactions}</span>
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
