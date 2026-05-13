import { useState } from "react"

// ── NoteBubble ──────────────────────────────────────────────────────────────
// Renders above the user's avatar.
//
// Behaviour:
//  • Own profile  → always visible; click opens NoteModal (via `onClick` prop)
//  • Other users  → visible only if note has content (caller controls visibility)
//                   text is capped at 25 chars; clicking expands the bubble in
//                   place to reveal the full note
const TRUNCATE_AT = 25

const NoteBubble = ({ note, isOwn, onClick, className = "" }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const isExpired = note?.expiresAt && new Date(note.expiresAt) <= new Date()
  const hasContent = !!(note?.text || note?.emoji) && !isExpired

  if (!hasContent && !isOwn) return null

  const rawText = note?.text ?? ""
  const isTruncated = !isOwn && rawText.length > TRUNCATE_AT
  const displayText =
    isTruncated && !isExpanded ? rawText.slice(0, TRUNCATE_AT) + "…" : rawText || null

  const handleClick = (e) => {
    // CRITICAL: Prevent the avatar's lightbox from opening
    e.stopPropagation()

    if (isOwn) {
      // If it's my profile, call the parent function to open the editor modal
      onClick?.(e)
    } else {
      // If it's someone else's, just toggle expansion
      setIsExpanded(!isExpanded)
    }
  }

  const isClickable = isOwn || (hasContent && isTruncated)

  return (
    /* Lowered the bubble by changing mb-5 to mb-2 */
    <div className={`absolute -top-6 left-1/2 z-20 -translate-x-1/2 ${className}`}>
      <div
        onClick={handleClick}
        className={[
          "relative flex items-start gap-1 rounded-3xl bg-base-200/95",
          "max-w-32 px-3 py-2 shadow-xl backdrop-blur-sm transition-all duration-300 ease-in-out",
          "origin-bottom",
          isExpanded ? "flex-col w-32" : "flex-row items-center",
          isClickable ? "cursor-pointer select-none" : "",
          isOwn ? "hover:border-primary/40 hover:bg-base-200" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {hasContent ? (
          isExpanded ? (
            <div className="animate-in fade-in zoom-in-95 flex w-full flex-col gap-0.5 duration-200">
              {note.emoji && <span className="text-sm leading-none">{note.emoji}</span>}
              {displayText && (
                <p className="text-pretty break-words text-[11px] font-medium leading-normal">
                  {displayText}
                </p>
              )}
            </div>
          ) : (
            <div className="flex w-full items-center gap-1.5 overflow-hidden">
              {note.emoji && <span className="shrink-0 text-sm">{note.emoji}</span>}
              {displayText && (
                <span className="flex-1 line-clamp-2 w-32 text-[11px] font-medium leading-tight">
                  {displayText}
                </span>
              )}
              {isTruncated && <span className="shrink-0 text-[9px] text-slate-400">›</span>}
            </div>
          )
        ) : (
          <span className="w-full whitespace-nowrap text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
            + Add note
          </span>
        )}

        {/* ── Thought Bubble Tail (Diagonal & Left-Aligned) ── */}
        <div className="absolute -bottom-3 left-6 flex flex-col items-center">
          {/* Medium Circle - Slightly offset left */}
          <div className="h-2.5 w-2.5 -translate-x-2.5 rounded-full bg-base-200/95 shadow-sm" />

          {/* Small Circle - Offset further left and down to "point" to the avatar */}
          <div className="h-1.5 w-1.5 -translate-x-1 translate-y-0 rounded-full bg-base-200/90 shadow-sm" />
        </div>
      </div>
    </div>
  )
}

export default NoteBubble
