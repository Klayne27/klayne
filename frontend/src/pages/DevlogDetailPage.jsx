import { useState, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"
import {
  useGetDevlog,
  useGetDevlogComments,
  useLikeDevlog,
  useCreateDevlogComment,
  useDeleteDevlogComment,
  useLikeDevlogComment,
  useDislikeDevlogComment,
} from "../features/devlog/devlogHooks/useDevlogMutations"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import LoadingSpinner from "../components/common/LoadingSpinner"
import AnimatedCount from "../components/common/AnimatedCount"
import { getOptimizedImageUrl } from "../utils/cloudinaryUtils"

const TAG_STYLES = {
  update: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  bugfix: "bg-red-500/20 text-red-400 border border-red-500/30",
  feature: "bg-green-500/20 text-green-400 border border-green-500/30",
  announcement: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  hotfix: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  "": "",
}

const TAG_LABELS = {
  update: "UPDATE",
  bugfix: "BUG FIX",
  feature: "FEATURE",
  announcement: "ANNOUNCEMENT",
  hotfix: "HOTFIX",
}

// ── Comment row ───────────────────────────────────────────────────────────────
const CommentRow = ({ comment, devlogId, authUserId, isAdmin }) => {
  const isLiked = comment.likes?.some((id) => id === authUserId || id?._id === authUserId)
  const isDisliked = comment.dislikes?.some((id) => id === authUserId || id?._id === authUserId)
  const isOwn = comment.author?._id === authUserId

  const { mutate: likeComment, isPending: liking } = useLikeDevlogComment(devlogId)
  const { mutate: dislikeComment, isPending: disliking } = useDislikeDevlogComment(devlogId)
  const { mutate: deleteComment, isPending: deleting } = useDeleteDevlogComment(devlogId)

  return (
    <div className="flex gap-3 border-b border-base-300/40 py-3 last:border-0">
      {/* avatar */}
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-base-300">
        {comment.author?.profileImg?.imageUrl ? (
          <img
            src={getOptimizedImageUrl(comment.author.profileImg.imageUrl, "avatar")}
            alt={comment.author.username}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-bold uppercase text-base-content/50">
            {comment.author?.username?.[0]}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {/* meta */}
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-semibold text-base-content">
            @{comment.author?.username}
          </span>
          <span className="text-xs text-base-content/40">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
        </div>

        {/* text */}
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-base-content/80">
          {comment.text}
        </p>

        {/* actions */}
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={() => likeComment({ devlogId, commentId: comment._id })}
            disabled={liking}
            className={`flex items-center gap-1 text-xs transition-colors ${isLiked ? "text-success" : "text-base-content/40 hover:text-success"}`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill={isLiked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
              />
            </svg>
            {comment.likes?.length || 0}
          </button>

          <button
            onClick={() => dislikeComment({ devlogId, commentId: comment._id })}
            disabled={disliking}
            className={`flex items-center gap-1 text-xs transition-colors ${isDisliked ? "text-error" : "text-base-content/40 hover:text-error"}`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill={isDisliked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
              />
            </svg>
            {comment.dislikes?.length || 0}
          </button>

          {(isOwn || isAdmin) && (
            <button
              onClick={() => deleteComment({ devlogId, commentId: comment._id })}
              disabled={deleting}
              className="ml-auto text-xs text-base-content/30 transition-colors hover:text-error"
            >
              {deleting ? (
                <LoadingSpinner size="xs" />
              ) : (
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Comment composer ──────────────────────────────────────────────────────────
const CommentComposer = ({ devlogId, authUser }) => {
  const [text, setText] = useState("")
  const { mutate: createComment, isPending } = useCreateDevlogComment(devlogId)
  const MAX = 500

  const handleSubmit = () => {
    if (!text.trim() || isPending) return
    createComment({ devlogId, text }, { onSuccess: () => setText("") })
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit()
  }

  return (
    <div className="flex gap-3 pt-4">
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-base-300">
        {authUser?.profileImg?.imageUrl ? (
          <img
            src={getOptimizedImageUrl(authUser.profileImg.imageUrl, "avatar")}
            alt={authUser.username}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-bold uppercase text-base-content/50">
            {authUser?.username?.[0]}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <textarea
          className="textarea textarea-bordered min-h-[72px] w-full resize-none text-sm"
          placeholder="Write a comment… (Ctrl+Enter to post)"
          value={text}
          maxLength={MAX}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="flex items-center justify-between">
          <span
            className={`text-xs ${text.length > MAX * 0.9 ? "text-warning" : "text-base-content/30"}`}
          >
            {text.length}/{MAX}
          </span>
          <button
            onClick={handleSubmit}
            disabled={isPending || !text.trim()}
            className="btn btn-primary btn-sm"
          >
            {isPending ? <LoadingSpinner size="xs" /> : "Post"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Detail page ───────────────────────────────────────────────────────────────
const DevlogDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { authUser } = useAuthUser()
  const isAdmin = authUser?.isAdmin

  const { data: devlog, isLoading: devlogLoading, isError } = useGetDevlog(id)
  const {
    comments,
    totalCount: commentCount,
    isLoading: commentsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetDevlogComments(id)

  const { mutate: likeDevlog } = useLikeDevlog()

  if (devlogLoading) {
    return (
      <div className="flex min-h-screen justify-center border-x border-base-300 py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (isError || !devlog) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 border-x border-base-300 text-base-content/40">
        <p className="text-sm">Devlog not found.</p>
        <button onClick={() => navigate("/devlog")} className="btn btn-ghost btn-sm">
          ← Back
        </button>
      </div>
    )
  }

  const isLiked = devlog.likes?.some((id) => id === authUser?._id || id?._id === authUser?._id)

  return (
    <div className="flex min-h-screen flex-col border-x border-base-300">
      {/* sticky header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-base-300 bg-base-100/80 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate("/devlog")} className="btn btn-circle btn-ghost btn-sm">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-black tracking-tight">Devlog</h1>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 p-4">
        {/* ── The devlog entry ── */}
        <article className="mb-6">
          {/* tag + pin */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {devlog.isPinned && (
              <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-yellow-400">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                </svg>
                Pinned
              </span>
            )}
            {devlog.tag && (
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-black tracking-widest ${TAG_STYLES[devlog.tag]}`}
              >
                {TAG_LABELS[devlog.tag]}
              </span>
            )}
          </div>

          {/* title */}
          <h2 className="mb-3 text-xl font-black leading-tight text-base-content">
            {devlog.title}
          </h2>

          {/* author + date */}
          <div className="mb-4 flex items-center gap-2">
            <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-base-300">
              {devlog.author?.profileImg?.imageUrl ? (
                <img
                  src={getOptimizedImageUrl(devlog.author.profileImg.imageUrl, "avatar")}
                  alt={devlog.author.username}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[8px] font-bold uppercase text-base-content/50">
                  {devlog.author?.username?.[0]}
                </div>
              )}
            </div>
            <span className="text-xs text-base-content/50">
              <span className="font-medium text-base-content/70">@{devlog.author?.username}</span>
              {" · "}
              {formatDistanceToNow(new Date(devlog.createdAt), { addSuffix: true })}
            </span>
          </div>

          {/* full body */}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-base-content/80">
            {devlog.body}
          </p>

          {/* like row */}
          <div className="mt-5 flex items-center gap-4 border-t border-base-300/50 pt-4">
            <button
              onClick={() => likeDevlog(devlog._id)}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${isLiked ? "text-error" : "text-base-content/50 hover:text-error"}`}
            >
              <svg
                className="h-5 w-5"
                fill={isLiked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <AnimatedCount count={devlog.likes?.length || 0} />{" "}
              {devlog.likes?.length === 1 ? "like" : "likes"}
            </button>

            <span className="flex items-center gap-1.5 text-sm text-base-content/40">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {commentCount} {commentCount === 1 ? "comment" : "comments"}
            </span>
          </div>
        </article>

        {/* ── Comment composer ── */}
        <div className="mb-6 border-t border-base-300/60 pt-4">
          <CommentComposer devlogId={id} authUser={authUser} />
        </div>

        {/* ── Comments ── */}
        <div>
          {commentsLoading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner size="md" />
            </div>
          ) : comments.length === 0 ? (
            <div className="py-12 text-center text-base-content/30">
              <p className="text-sm">No comments yet. Be the first!</p>
            </div>
          ) : (
            <>
              {comments.map((comment) => (
                <CommentRow
                  key={comment._id}
                  comment={comment}
                  devlogId={id}
                  authUserId={authUser?._id}
                  isAdmin={isAdmin}
                />
              ))}

              {hasNextPage && (
                <button
                  onClick={fetchNextPage}
                  disabled={isFetchingNextPage}
                  className="btn btn-ghost btn-sm mt-3 w-full"
                >
                  {isFetchingNextPage ? <LoadingSpinner size="xs" /> : "Load more comments"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default DevlogDetailPage
