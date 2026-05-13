// components/common/UserNote.jsx
import { useState, useEffect, useRef } from "react"

/**
 * Thought-bubble note shown above a user's avatar.
 *
 * Props:
 *   note        – { text, emoji } from user object
 *   isClickable – false when rendered in your own edit context
 */
const UserNote = ({ note, isClickable = true }) => {
  const [expanded, setExpanded] = useState(false)
  const bubbleRef = useRef(null)

  const text = note?.text?.trim() || ""
  const emoji = note?.emoji || ""

  const PREVIEW_CHARS = 20
  const isTruncatable = isClickable && text.length > PREVIEW_CHARS

  // Collapse on outside click
  useEffect(() => {
    if (!expanded) return
    const onOutside = (e) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target)) {
        setExpanded(false)
      }
    }
    document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [expanded])

  if (!text && !emoji) return null

  const displayText = isTruncatable && !expanded ? text.slice(0, PREVIEW_CHARS) + "…" : text

  return (
    <div ref={bubbleRef} className="relative mb-1 inline-flex select-none flex-col items-start">
      {/* ── Bubble ───────────────────────────────────────────────────────── */}
      <div
        role={isTruncatable ? "button" : undefined}
        tabIndex={isTruncatable ? 0 : undefined}
        aria-expanded={isTruncatable ? expanded : undefined}
        onClick={() => isTruncatable && setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (isTruncatable && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault()
            setExpanded((v) => !v)
          }
        }}
        className={[
          "relative rounded-2xl rounded-bl-none border border-accent/40 bg-base-200",
          "px-3 py-1.5 shadow-sm",
          "transition-all duration-200 ease-in-out",
          isTruncatable
            ? "cursor-pointer hover:border-primary/50 active:scale-95"
            : "cursor-default",
          expanded ? "max-w-[220px] border-primary/40" : "max-w-[150px]",
        ].join(" ")}
      >
        <span className="flex flex-wrap items-center gap-1 leading-snug">
          {emoji && <span className="shrink-0 text-sm">{emoji}</span>}
          {text && (
            <span className="break-words text-[11px] text-base-content/80">{displayText}</span>
          )}
          {/* Subtle dot signals the note is expandable */}
          {isTruncatable && !expanded && (
            <span className="ml-0.5 inline-block size-1 shrink-0 self-center rounded-full bg-primary/50" />
          )}
        </span>
      </div>

      {/* ── Tail pointing down-left toward the avatar ────────────────────── */}
      <div className="absolute -bottom-[5px] left-4 size-2.5 rotate-45 border-b border-r border-accent/40 bg-base-200" />
    </div>
  )
}

export default UserNote
