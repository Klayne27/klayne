import { FaComment } from "react-icons/fa"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils"
import { formatPostDateShort } from "../../../utils/date"
import { useRef, useState } from "react"
import { useMessagingMetaData } from "../../../hooks/customHooks/useMessagingMetaData"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { useReactToBoardPost } from "../boardHooks/boardMutations"
import MessageReactions from "../../chat/common/components/MessageReactions"

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
  const { authUser } = useAuthUser() // You'll need this for the reaction component
  const { emoji: topEmoji } = getMostUsedEmojiData(post.reactions)
  const { reactToPost } = useReactToBoardPost()

  // 1. Prepare data for the reaction component
  const messageShape = { ...post, _id: post._id }
  const { groupedReactions, hasAnyReactions } = useMessagingMetaData(messageShape, authUser)

  // 2. Filter groupedReactions to only include the topEmoji
  const topEmojiGroup =
    topEmoji && groupedReactions[topEmoji] ? { [topEmoji]: groupedReactions[topEmoji] } : {}

  // Handlers for reactions (you likely have these in BoardPage, pass them down as props)
  const handleReactionClick = (id, emoji) => {
    reactToPost({ id: id, emoji })
  }

  const cardRef = useRef(null)
  const [rotate, setRotate] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    // Tilt intensity (5 degrees max)
    const rotateX = ((y - centerY) / centerY) * -5
    const rotateY = ((x - centerX) / centerX) * 5

    setRotate({ x: rotateX, y: rotateY })
  }

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 })
  }

  return (
    <div className="z-0 w-full perspective-1000">
      <div
        ref={cardRef}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
          // Add this to ensure the transform doesn't break out of the container
          transformStyle: "preserve-3d",
          transition:
            rotate.x === 0
              ? "transform 0.5s ease, background-color 0.2s ease, box-shadow 0.2s ease"
              : "background-color 0.2s ease, box-shadow 0.2s ease",
        }}
        // Ensure relative and z-0 are here
        className={`relative z-0 flex aspect-square cursor-pointer flex-col rounded-xl border border-accent p-4 shadow-sm hover:bg-secondary/20 hover:shadow-xl ${
          isSelected ? "border-primary bg-primary/5" : "bg-base-200/50"
        }`}
      >
        {/* Top Section: User Info */}
        <div className="mb-2 flex flex-shrink-0 items-center gap-2">
          <img
            src={getOptimizedImageUrl(post.user?.profileImg?.imageUrl, "avatar")}
            alt={post.user?.username}
            className="h-7 w-7 flex-shrink-0 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="text-md truncate font-bold leading-none">{post.user?.fullName}</p>
              {post.user?.isVerified && (
                <img src="/verified2.png" className="size-[17px]" alt="Verified" />
              )}
              {post.user?.isGoldVerified && (
                <img src="/gold-verified2.png" className="size-[17px]" alt="Gold Verified" />
              )}
            </div>
            <p className="truncate text-xs text-slate-500">@{post.user?.username}</p>
          </div>
          <span className="text-base-500 hidden text-xs font-normal opacity-60 sm:block">
            {formatPostDateShort(post.createdAt)}
          </span>
        </div>

        {/* Middle Section: Title & (Image OR Content) */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <p className="mb-1 line-clamp-2 text-sm font-bold leading-tight">{post.title}</p>

          {/* Replace the existing image block with: */}
          {post?.images?.length > 0 ? (
            <div
              className={`mt-1 grid min-h-0 flex-1 gap-1 ${
                post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
              }`}
            >
              {post.images.slice(0, 4).map((img, i) => (
                <div
                  key={img._id || i}
                  className={`relative overflow-hidden rounded-md border border-accent ${
                    post.images.length === 3 && i === 0 ? "col-span-2" : ""
                  }`}
                >
                  <img
                    src={img.imageUrl}
                    className="h-full w-full object-cover"
                    alt={`post image ${i + 1}`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="min-h-0 flex-1 rounded-lg border border-accent/50 bg-base-300/30 p-2">
              <p className="line-clamp-6 break-words text-xs leading-relaxed text-slate-400">
                {post.content}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Section: Stats */}
        <div className="mt-3 flex flex-shrink-0 items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <FaComment size={18} className="text-slate-400" />
              {post.commentsCount || 0}
            </span>

            {/* {topEmoji && (
              <span className="flex items-center gap-1">
                <span>{topEmoji}</span>
                <span>{topEmojiCount}</span>
              </span>
            )} */}
          </div>
          {hasAnyReactions && topEmoji && (
            <div className="min-w-0">
              <MessageReactions
                groupedReactions={topEmojiGroup} // Only passing the winner
                currentUser={authUser}
                isSentByCurrentUser={false}
                message={messageShape}
                onReactionClick={handleReactionClick}
                // Hide the "+" button on the card to keep it clean
                hideAddButton={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default BoardPostCard
