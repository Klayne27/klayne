import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  useCreateDevlog,
  useUpdateDevlog,
  useDeleteDevlog,
  useLikeDevlog,
} from "../features/devlog/devlogHooks/useDevlogMutations"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import LoadingSpinner from "../components/common/LoadingSpinner"
import { formatDistanceToNow } from "date-fns"
import { getOptimizedImageUrl } from "../utils/cloudinaryUtils"
import { useGetDevlogs } from "../features/devlog/devlogHooks/useDevlogQueries"

const TAG_STYLES = {
  update: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  bugfix: "bg-red-500/20 text-red-400 border border-red-500/30",
  feature: "bg-green-500/20 text-green-400 border border-green-500/30",
  announcement: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  hotfix: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  "": "bg-base-300/50 text-base-content/40 border border-base-300",
}

const TAG_LABELS = {
  update: "UPDATE",
  bugfix: "BUG FIX",
  feature: "FEATURE",
  announcement: "ANNOUNCEMENT",
  hotfix: "HOTFIX",
  "": "MISC",
}

const EMPTY_FORM = { title: "", body: "", tag: "", isPinned: false }

// ── Card ──────────────────────────────────────────────────────────────────────
const DevlogCard = ({ devlog, isAdmin, authUserId, onEdit, onDelete, onLike }) => {
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false) // New state for toggling

  const isLiked = devlog.likes?.some((id) => id === authUserId || id?._id === authUserId)

  const handleCardClick = (e) => {
    // Don't navigate if clicking action buttons (edit/delete/like)
    if (e.target.closest("[data-action]")) return
    navigate(`/devlog/${devlog._id}`)
  }

  const toggleExpand = (e) => {
    e.stopPropagation() // Prevents the card's onClick (navigation) from firing
    setIsExpanded(!isExpanded)
  }

  return (
    <article
      onClick={handleCardClick}
      className="relative cursor-pointer overflow-hidden rounded-xl border border-base-300 bg-base-200/40 transition-all hover:border-base-content/20 hover:bg-base-200/70"
    >
      {devlog.isPinned && (
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-yellow-500 via-yellow-400 to-transparent" />
      )}

      <div className="p-5">
        {/* header */}
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

          {isAdmin && (
            <div data-action className="flex shrink-0 items-center gap-1">
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

        {/* body preview */}
        <p
          className={`${!isExpanded ? "line-clamp-3" : ""} whitespace-pre-wrap text-sm leading-relaxed text-base-content/70`}
        >
          {devlog.body}
        </p>

        {/* Toggle Button */}
        {devlog.body.length > 180 && (
          <button
            data-action
            className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
            onClick={toggleExpand}
          >
            {isExpanded ? "Show less ↑" : "Read more →"}
          </button>
        )}

        {/* footer */}
        <div className="mt-4 flex items-center justify-between border-t border-base-300/50 pt-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full bg-base-300">
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
            <span className="text-xs text-base-content/40">
              <span className="font-medium text-base-content/60">@{devlog.author?.username}</span>
              {" · "}
              {formatDistanceToNow(new Date(devlog.createdAt), { addSuffix: true })}
            </span>
          </div>

          {/* like + comment counts */}
          <div className="flex items-center gap-3">
            <button
              data-action
              onClick={() => onLike(devlog._id)}
              className={`flex items-center gap-1 text-xs transition-colors ${isLiked ? "text-error" : "text-base-content/40 hover:text-error"}`}
            >
              <svg
                className="h-4 w-4"
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

              {devlog.likes?.length || 0}
            </button>

            <span className="flex items-center gap-1 text-xs text-base-content/40">
              <svg
                className="h-4 w-4"
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
              {devlog.commentsCount || 0}
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

// ── Admin form modal ──────────────────────────────────────────────────────────
const DevlogFormModal = ({ initial, onClose, onCreate, onUpdate, isPending }) => {
  const isEditing = !!initial?._id
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.title.trim() || !form.body.trim()) return
    isEditing ? onUpdate({ id: initial._id, ...form }) : onCreate(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-base-300 bg-base-200 shadow-2xl">
        <div className="flex items-center justify-between border-b border-base-300 p-5">
          <h3 className="text-base font-bold">{isEditing ? "Edit Devlog" : "New Devlog"}</h3>
          <button onClick={onClose} className="btn btn-circle btn-ghost btn-sm">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3 p-5">
          <input
            className="input input-bordered w-full text-sm"
            placeholder="Title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
          <textarea
            className="textarea textarea-bordered w-full resize-none text-sm"
            placeholder="What's the update?"
            rows={6}
            value={form.body}
            onChange={(e) => set("body", e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="select select-bordered select-sm flex-1"
              value={form.tag}
              onChange={(e) => set("tag", e.target.value)}
            >
              <option value="">No tag</option>
              <option value="update">Update</option>
              <option value="bugfix">Bug Fix</option>
              <option value="feature">Feature</option>
              <option value="announcement">Announcement</option>
              <option value="hotfix">Hotfix</option>
            </select>
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-base-content/70">
              <input
                type="checkbox"
                className="checkbox-warning checkbox checkbox-sm"
                checked={form.isPinned}
                onChange={(e) => set("isPinned", e.target.checked)}
              />
              Pin to top
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !form.title.trim() || !form.body.trim()}
            className="btn btn-primary btn-sm"
          >
            {isPending ? <LoadingSpinner size="xs" /> : isEditing ? "Save changes" : "Post"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
const DevlogPage = () => {
  const { authUser } = useAuthUser()
  const isAdmin = authUser?.isAdmin

  const { devlogs, totalCount, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetDevlogs()

  const { mutate: createDevlog, isPending: isCreating } = useCreateDevlog()
  const { mutate: updateDevlog, isPending: isUpdating } = useUpdateDevlog()
  const { mutate: deleteDevlog } = useDeleteDevlog()
  const { mutate: likeDevlog } = useLikeDevlog()

  const [modal, setModal] = useState(null)

  const handleDelete = (id) => {
    if (window.confirm("Delete this devlog?")) deleteDevlog(id)
  }

  return (
    <div className="flex min-h-screen flex-col border-x border-base-300">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-base-300 bg-base-100/80 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="text-base font-black tracking-tight">Devlog</h1>
          {totalCount > 0 && (
            <p className="mt-0.5 text-xs text-base-content/40">{totalCount} entries</p>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => setModal({ mode: "create" })}
            className="btn btn-primary btn-sm gap-1"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Entry
          </button>
        )}
      </div>

      <div className="flex-1 p-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : devlogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-base-content/30">
            <svg
              className="h-12 w-12"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm font-medium">No devlogs yet</p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {devlogs.map((devlog) => (
              <DevlogCard
                key={devlog._id}
                devlog={devlog}
                isAdmin={isAdmin}
                authUserId={authUser?._id}
                onEdit={(d) => setModal({ mode: "edit", devlog: d })}
                onDelete={handleDelete}
                onLike={likeDevlog}
              />
            ))}

            {hasNextPage && (
              <button
                onClick={fetchNextPage}
                disabled={isFetchingNextPage}
                className="btn btn-ghost btn-sm mx-auto mt-2"
              >
                {isFetchingNextPage ? <LoadingSpinner size="xs" /> : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>

      {modal && (
        <DevlogFormModal
          initial={modal.mode === "edit" ? modal.devlog : undefined}
          onClose={() => setModal(null)}
          onCreate={(payload) => createDevlog(payload, { onSuccess: () => setModal(null) })}
          onUpdate={(payload) => updateDevlog(payload, { onSuccess: () => setModal(null) })}
          isPending={isCreating || isUpdating}
        />
      )}
    </div>
  )
}

export default DevlogPage
