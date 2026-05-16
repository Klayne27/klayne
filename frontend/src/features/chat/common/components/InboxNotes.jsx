// features/chat/private/components/InboxNotes.jsx
//
// Instagram-style note strip.
// Layout per card:
//   - Avatar is the layout anchor (fixed size, always on the same baseline)
//   - Bubble is position:absolute, top-0, overlapping DOWN onto the avatar
//   - Bubble width shrinks to match content length dynamically
//   - Bubble expands downward when tapped (more z-index, grows height)
//   - Strip is a single fixed-height scrollable row — no vertical shift ever

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthUser } from "../../../auth/authHooks/useAuthUser"
import UserAvatar from "../../../../components/common/UserAvatar"
import NoteModal from "../../../../components/common/NoteModal"
import { useGetOrCreateConversation } from "../../private/privateChatHooks/usePrivateChatQueries"
import { useGetInboxNotes } from "../../../users/usersHooks/useUserQueries"

const TRUNCATE_AT = 18

// ── Bubble ────────────────────────────────────────────────────────────────────
const InboxNoteBubble = ({ note, isOwn, onBubbleClick }) => {
  const [expanded, setExpanded] = useState(false)

  const isExpired = note?.expiresAt && new Date(note.expiresAt) <= new Date()
  const hasContent = !!(note?.text || note?.emoji) && !isExpired

  if (!hasContent && !isOwn) return null

  const rawText = note?.text ?? ""
  const isTruncated = rawText.length > TRUNCATE_AT
  const displayText = isTruncated && !expanded ? rawText.slice(0, TRUNCATE_AT) + "…" : rawText

  const handleClick = (e) => {
    e.stopPropagation()
    if (isOwn) {
      onBubbleClick?.(e)
    } else if (hasContent) {
      setExpanded((v) => !v)
    }
  }

  return (
    // FIXED: Changed `left-0 right-0` to `left-1/2 -translate-x-1/2` and `w-max max-w-[84px]`
    // This allows the bubble wrapper to size itself perfectly to the text length rather than expanding to the full avatar width.
    <div
      className="absolute -top-5 left-1/2 z-20 flex w-max max-w-[84px] -translate-x-1/2 flex-col items-start pb-3"
      style={{ pointerEvents: "none" }}
    >
      {/* Actual bubble — pointer-events re-enabled */}
      <div
        onClick={handleClick}
        style={{ pointerEvents: "auto" }}
        className={[
          "w-full rounded-2xl border border-white/10 bg-base-200/95 px-2.5 py-1.5",
          "shadow-lg backdrop-blur-sm transition-all duration-200",
          "cursor-pointer",
          expanded ? "rounded-b-2xl" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {hasContent ? (
          // FIXED: Changed flex layout direction to `flex-col` to move emojis cleanly to the top, separate from text row.
          <div className="flex flex-col gap-0.5">
            {note.emoji && (
              <span className="mb-0.5 block text-left text-xs leading-none">{note.emoji}</span>
            )}
            {displayText && (
              <span className="break-words text-left text-[10px] font-semibold leading-tight tracking-wide">
                {displayText}
              </span>
            )}
          </div>
        ) : (
          <span className="block w-full whitespace-nowrap px-1 text-center text-[9px] font-bold uppercase tracking-wide text-slate-400">
            + Add note
          </span>
        )}
      </div>

      {/* Thought-bubble tail — FIXED: Anchored to the bottom-left corner of the bubble */}
      <div
        className="absolute bottom-0 left-3 flex flex-col items-center gap-[2px]"
        style={{ pointerEvents: "none" }}
      >
        <div className="h-[8px] w-[8px] rounded-full bg-base-200/95 shadow-sm" />
        <div className="h-[4px] w-[4px] rounded-full bg-base-200/90 ml-2" />
      </div>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
const NoteCard = ({ user, isOwn, onAvatarClick, onBubbleClick }) => {
  const note = isOwn ? user.note : user.note
  const nameColor = user?.nameColor

  return (
    <div className="flex w-16 flex-shrink-0 flex-col items-center gap-1.5">
      {/* Avatar + bubble container — the layout anchor */}
      <div className="relative mt-8 w-20">
        <InboxNoteBubble note={note ?? null} isOwn={isOwn} onBubbleClick={onBubbleClick} />
        <div onClick={onAvatarClick} className="cursor-pointer">
          <UserAvatar user={user} size="xl" />
        </div>
      </div>

      {/* Label */}
      <span
        className="w-full truncate text-center text-[11px] font-medium"
        style={nameColor ? { color: nameColor } : undefined}
      >
        {isOwn ? <span className="text-slate-500">You</span> : user.fullName}
      </span>
    </div>
  )
}

// ── Strip ─────────────────────────────────────────────────────────────────────
const InboxNotes = () => {
  const { authUser } = useAuthUser()
  const { notes, isLoading } = useGetInboxNotes()
  const navigate = useNavigate()
  const { getOrCreateConversation, isCreatingConversation } = useGetOrCreateConversation()
  const [noteModalOpen, setNoteModalOpen] = useState(false)

  if (!authUser) return null

  const activeNotes = notes.filter((u) => {
    if (!u.note || (!u.note.text && !u.note.emoji)) return false
    if (u.note.expiresAt && new Date(u.note.expiresAt) <= new Date()) return false
    return true
  })

  return (
    <>
      <div
        className="flex gap-8 px-4 py-3"
        style={{
          overflowX: "auto",
          overflowY: "visible",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Own card */}
        <NoteCard
          user={authUser}
          isOwn
          onAvatarClick={() => navigate(`/profile/${authUser.username}`)}
          onBubbleClick={() => setNoteModalOpen(true)}
        />

        {/* Followed users with active notes */}
        {!isLoading &&
          activeNotes.map((u) => (
            <NoteCard
              key={u._id}
              user={u}
              isOwn={false}
              onAvatarClick={() =>
                !isCreatingConversation && getOrCreateConversation({ targetUserId: u._id })
              }
            />
          ))}
      </div>

      {noteModalOpen && (
        <NoteModal
          isOpen
          onClose={() => setNoteModalOpen(false)}
          currentNote={authUser.note ?? null}
          authUser={authUser}
        />
      )}
    </>
  )
}

export default InboxNotes
