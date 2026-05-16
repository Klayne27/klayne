
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthUser } from "../../../auth/authHooks/useAuthUser"
import UserAvatar from "../../../../components/common/UserAvatar"
import NoteModal from "../../../../components/common/NoteModal"
import { useGetConversations, useGetOrCreateConversation } from "../../private/privateChatHooks/usePrivateChatQueries"
import { useGetInboxNotes } from "../../../users/usersHooks/useUserQueries"
import UserFullName from "../../../../components/common/UserFullname"
import { usePrivateChatStore } from "../../../../store/usePrivateChatStore"

// ── Bubble ────────────────────────────────────────────────────────────────────
const InboxNoteBubble = ({ note, isOwn, onBubbleClick }) => {
  const [expanded, setExpanded] = useState(false)

  const isExpired = note?.expiresAt && new Date(note.expiresAt) <= new Date()
  const hasContent = !!(note?.text || note?.emoji) && !isExpired

  if (!hasContent && !isOwn) return null

  const rawText = note?.text ?? ""

  const handleClick = (e) => {
    e.stopPropagation()
    if (isOwn) {
      onBubbleClick?.(e)
    } else if (hasContent) {
      setExpanded((v) => !v)
    }
  }

  return (
    <div
      className="absolute -top-6 left-1/2 z-20 flex w-max max-w-[90px] -translate-x-1/2 flex-col items-start pb-3"
      style={{ pointerEvents: "none" }}
    >
      {/* Actual bubble — pointer-events re-enabled */}
      <div
        onClick={handleClick}
        style={{ pointerEvents: "auto" }}
        className={[
          "w-full rounded-2xl bg-base-200/95 px-2 py-1.5",
          "shadow-lg backdrop-blur-sm transition-all duration-200",
          "cursor-pointer",
          expanded ? "rounded-b-2xl" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {hasContent ? (
          /* FIXED: Changed layout to row alignment so emoji stays cleanly on the left */
          <div className="flex flex-row items-center justify-start gap-1">
            {note.emoji && <span className="shrink-0 text-xs leading-none">{note.emoji}</span>}
            {rawText && (
              /* FIXED: Applied Tailwind's line-clamp utilities to cleanly lock to 2 lines maximum when collapsed */
              <span
                className={[
                  "break-words text-left text-[10px] font-semibold leading-tight tracking-wide",
                  !expanded ? "line-clamp-2" : "",
                ].join(" ")}
              >
                {rawText}
              </span>
            )}
          </div>
        ) : (
          <span className="block w-full whitespace-nowrap px-1 text-center text-[9px] font-bold uppercase tracking-wide text-slate-400">
            + Add note
          </span>
        )}
      </div>

      {/* Thought-bubble tail — Anchored to the bottom-left corner of the bubble */}
      <div
        className="absolute bottom-[2px] left-3 flex flex-col items-center gap-[2px]"
        style={{ pointerEvents: "none" }}
      >
        <div className="h-[6px] w-[6px] rounded-full bg-base-200/95 shadow-sm" />
        <div className="ml-1.5 h-[3.5px] w-[3.5px] rounded-full bg-base-200/90" />
      </div>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
const NoteCard = ({ user, isOwn, onAvatarClick, onBubbleClick }) => {
  const note = user?.note
  const nameColor = user?.nameColor

  return (
    <div className="flex w-16 flex-shrink-0 flex-col items-center ">
      {/* Avatar + bubble container — the layout anchor */}
      <div className="relative mt-8 w-20">
        <InboxNoteBubble note={note ?? null} isOwn={isOwn} onBubbleClick={onBubbleClick} />
        <div onClick={onAvatarClick} className="cursor-pointer">
          <UserAvatar user={user} size="xl" />
        </div>
      </div>

      {/* Label */}
      {isOwn ? (
        <span className="text-slate-500 text-xs">Your Note</span>
      ) : (
        <UserFullName className={"text-xs font-semibold"} user={user} style={nameColor ? { color: nameColor } : undefined} />
      )}
    </div>
  )
}

// ── Strip ────────────────────────────────────────────────────────────────────
const InboxNotes = () => {
  const { authUser } = useAuthUser()
  const { notes, isLoading } = useGetInboxNotes()
  const navigate = useNavigate()
  const { getOrCreateConversation, isCreatingConversation } = useGetOrCreateConversation()
  const [noteModalOpen, setNoteModalOpen] = useState(false)

  const {conversations} = useGetConversations()
  const setReplyingToMessage = usePrivateChatStore((state) => state.setReplyingToMessage)
  const setAudioBlob = usePrivateChatStore((state) => state.setAudioBlob)

  const handleAvatarClick = (targetUser) => {
    // Look through active conversations list for a DM with this participant
    const directMatch = conversations.find(
      (c) =>
        !c.isGroup && c.participants?.some((p) => String(p._id || p) === String(targetUser._id)),
    )

    if (directMatch) {
      // Recreate exactly how your conversation item clicks navigate locally
      navigate(`/messages/${directMatch._id}`)
      if (setReplyingToMessage) setReplyingToMessage(null)
      if (setAudioBlob) setAudioBlob(null)
    } else {
      // Fallback: If no previous conversation exists in local memory array,
      // view their profile instead of breaking
      navigate(`/profile/${targetUser.username}`)
    }
  }

  if (!authUser) return null

  const activeNotes = notes.filter((u) => {
    if (!u.note || (!u.note.text && !u.note.emoji)) return false
    if (u.note.expiresAt && new Date(u.note.expiresAt) <= new Date()) return false
    return true
  })

  return (
    <>
      <div
        className="flex gap-10 px-4 py-3 overflow-y-hidden"
        style={{
          overflowX: "auto",
        //   overflowY: "visible",
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
                handleAvatarClick(u)
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
