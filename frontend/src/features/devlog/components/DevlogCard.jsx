import { formatDistanceToNow } from "date-fns"
import { useState } from "react"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils"

const TAG_STYLES = {
  update: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  bugfix: "bg-red-500/20 text-red-400 border border-red-500/30",
  feature: "bg-green-500/20 text-green-400 border border-green-500/30",
  announcement: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  hotfix: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  "": "bg-base-300/50 text-base-content/50 border border-base-300",
}

const TAG_LABELS = {
  update: "UPDATE",
  bugfix: "BUG FIX",
  feature: "FEATURE",
  announcement: "ANNOUNCEMENT",
  hotfix: "HOTFIX",
  "": "MISC",
}

// ── Single devlog card ────────────────────────────────────────────────────────
const DevlogCard = ({ devlog, isAdmin, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false)
  const isLong = devlog.body.length > 280

  return (
    <article className="relative overflow-hidden rounded-xl border border-accent bg-base-200/40 transition-all hover:border-accent/40">
      {/* pinned stripe */}
      {devlog.isPinned && (
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-yellow-500 via-yellow-400 to-transparent" />
      )}

      <div className="p-5 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        {/* header row */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
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

          {/* admin actions */}
          {isAdmin && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => onEdit(devlog)}
                className="btn btn-ghost btn-xs text-base-content/50 hover:text-primary"
              >
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
                    d="M15.232 5.232l3.536 3.536M9 11l6.232-6.232a2 2 0 012.828 2.828L11.828 13.828A2 2 0 0111 14.414l-3.414.586.586-3.414A2 2 0 019 11z"
                  />
                </svg>
              </button>
              <button
                onClick={() => onDelete(devlog._id)}
                className="btn btn-ghost btn-xs text-base-content/50 hover:text-error"
              >
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
              </button>
            </div>
          )}
        </div>

        {/* title */}
        <h2 className="mb-2 text-base font-bold leading-snug text-base-content">{devlog.title}</h2>

        {/* body */}
        <p
          className={`whitespace-pre-wrap text-sm leading-relaxed text-base-content/70 ${!expanded && isLong ? "line-clamp-4" : ""}`}
        >
          {devlog.body}
        </p>
        {isLong && (
          <button
            className="mt-1 text-xs text-primary hover:underline"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}

        {/* footer */}
        <div className="mt-4 flex items-center gap-2 border-t border-accent/50 pt-3">
          <div className="avatar">
            <div className="h-5 w-5 rounded-full">
              {devlog.author?.profileImg?.imageUrl ? (
                <img src={getOptimizedImageUrl(devlog.author.profileImg.imageUrl, "avatar")} alt={devlog.author.username} />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-base-300 text-[8px] font-bold uppercase text-base-content/50">
                  {devlog.author?.username?.[0]}
                </div>
              )}
            </div>
          </div>
          <span className="text-xs text-base-content/40">
            <span className="font-medium text-base-content/60">@{devlog.author?.username}</span>
            {" · "}
            {formatDistanceToNow(new Date(devlog.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>
    </article>
  )
}

export default DevlogCard