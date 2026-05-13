import { useState, useEffect, useRef } from "react"
import { IoClose } from "react-icons/io5"
import { MdOutlineEmojiEmotions } from "react-icons/md"
import { useEmojiPickerPopover } from "../../hooks/customHooks/useEmojiPickerPopover"
import { useDeleteNote, useUpdateNote } from "../../features/users/usersHooks/useUserMutations"
import UserAvatar from "./UserAvatar"
import NoteBubble from "./NoteBubble"
import EmojiPickerPopover from "./EmojiPickerPopover"

const DURATION_OPTIONS = [
  { label: "1 hour", value: 1 },
  { label: "8 hours", value: 8 },
  { label: "24 hours", value: 24 },
  { label: "1 week", value: 168 },
  { label: "Forever", value: 0 },
]

const NoteModal = ({ isOpen, onClose, currentNote, authUser }) => {
  const [text, setText] = useState("")
  const [emoji, setEmoji] = useState("")
  const [expiresInHours, setExpires] = useState(24)

  const emojiButtonRef = useRef(null)
  const textareaRef = useRef(null) // Ref for auto-resize

  const {
    showEmojiPickerPopover,
    popoverPosition,
    handleOpenEmojiPickerPopover,
    handleCloseEmojiPickerPopover,
  } = useEmojiPickerPopover()

  const { updateNote, isUpdatingNote } = useUpdateNote()
  const { deleteNote, isDeletingNote } = useDeleteNote()

  // Auto-resize logic
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to shrink if text is deleted
      textareaRef.current.style.height = "0px"
      // Set height to scrollHeight
      const scrollHeight = textareaRef.current.scrollHeight
      textareaRef.current.style.height = `${scrollHeight}px`
    }
  }, [text, isOpen]) // Re-run when text changes or modal opens

  useEffect(() => {
    if (!isOpen) return
    setText(currentNote?.text ?? "")
    setEmoji(currentNote?.emoji ?? "")
    setExpires(24)
  }, [isOpen, currentNote])

  const handleEmojiClick = (emojiData) => {
    setEmoji(emojiData.emoji)
    handleCloseEmojiPickerPopover()
  }

  const handleSave = () => {
    if (!text.trim() && !emoji) return
    updateNote(
      { text: text.trim(), emoji, expiresInHours: expiresInHours || null },
      { onSuccess: onClose },
    )
  }

  const handleDelete = () => {
    deleteNote(undefined, { onSuccess: onClose })
  }

  const hasNote = !!(currentNote?.text || currentNote?.emoji)
  const charCount = text.length
  const isOverLimit = charCount >= 60
  const isEmpty = !text.trim() && !emoji

  const previewNote = { text: text.trim() || null, emoji: emoji || null, expiresAt: null }
  const previewHasContent = !!(previewNote.text || previewNote.emoji)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-700/70"
      onClick={onClose}
    >
      <div
        className="relative mx-2 w-full max-w-sm rounded-2xl bg-base-100 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold">Your Note</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-secondary">
            <IoClose size={20} />
          </button>
        </div>

        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="relative mt-8">
            {previewHasContent && <NoteBubble note={previewNote} isOwn={false} />}
            <UserAvatar user={authUser} size="xl" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Preview</p>
        </div>

        {/* Updated Input Container to handle multi-line alignment */}
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-accent bg-base-200/40 px-3 py-2">
          <button
            ref={emojiButtonRef}
            type="button"
            onClick={handleOpenEmojiPickerPopover}
            className="mt-0.5 flex shrink-0 items-center justify-center rounded-lg p-1 text-xl transition hover:bg-secondary"
            title="Add emoji"
          >
            {emoji ? (
              <span className="leading-none">{emoji}</span>
            ) : (
              <MdOutlineEmojiEmotions className="text-slate-400" size={22} />
            )}
          </button>

          {/* Swapped input for textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind?"
            maxLength={60}
            className="max-h-32 flex-1 resize-none bg-transparent py-1.5 text-sm placeholder-slate-500 focus:outline-none"
          />

          <span
            className={`mt-2 shrink-0 text-[10px] font-bold tabular-nums ${
              isOverLimit ? "text-error" : charCount > 50 ? "text-warning" : "text-slate-500"
            }`}
          >
            {charCount}/60
          </span>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Expires after
          </label>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setExpires(opt.value)}
                className={`rounded-lg border px-3 py-1 text-[11px] font-bold transition-all ${
                  expiresInHours === opt.value
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-accent bg-base-200/50 text-slate-500 hover:border-accent/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {hasNote && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeletingNote}
              className="flex-1 rounded-lg border border-error/40 py-2 text-sm font-bold text-error transition hover:bg-error/10 disabled:opacity-50"
            >
              {isDeletingNote ? "Removing…" : "Remove note"}
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isEmpty || isUpdatingNote}
            className="flex-1 rounded-lg bg-primary py-2 text-sm font-bold text-white transition hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUpdatingNote ? "Saving…" : hasNote ? "Update" : "Save"}
          </button>
        </div>

        {showEmojiPickerPopover && (
          <EmojiPickerPopover
            position={popoverPosition}
            onClose={handleCloseEmojiPickerPopover}
            onEmojiClick={handleEmojiClick}
            triggerRef={emojiButtonRef}
          />
        )}
      </div>
    </div>
  )
}

export default NoteModal
