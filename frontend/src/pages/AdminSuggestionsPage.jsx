import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FaArrowLeft, FaTrash } from "react-icons/fa"
import { formatDistanceToNow } from "date-fns"
import {
  useDeleteSuggestion,
  useUpdateSuggestion,
} from "../features/suggestions/suggestionHooks/useSuggestionMutations"
import { useGetAllSuggestions } from "../features/suggestions/suggestionHooks/useSuggestionQueries"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import LoadingSpinner from "../components/common/LoadingSpinner"
import { getOptimizedImageUrl } from "../utils/cloudinaryUtils"

const STATUS_COLORS = {
  pending: "bg-yellow-500/20 text-yellow-400",
  reviewed: "bg-blue-500/20 text-blue-400",
  planned: "bg-purple-500/20 text-purple-400",
  done: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
}

const TYPE_COLORS = {
  feature: "bg-sky-500/20 text-sky-400",
  bug: "bg-red-500/20 text-red-400",
  idea: "bg-violet-500/20 text-violet-400",
  other: "bg-slate-500/20 text-slate-400",
}

const STATUSES = ["pending", "reviewed", "planned", "done", "rejected"]
const TYPES = ["feature", "bug", "idea", "other"]

const SuggestionCard = ({ suggestion }) => {
  const { updateSuggestion, isPending } = useUpdateSuggestion()
  const { deleteSuggestion } = useDeleteSuggestion()
  const [adminNote, setAdminNote] = useState(suggestion.adminNote || "")
  const [expanded, setExpanded] = useState(false)
  const [imgOpen, setImgOpen] = useState(false)

  const handleStatusChange = (e) => updateSuggestion({ id: suggestion._id, status: e.target.value })
  const handleNoteSave = () => updateSuggestion({ id: suggestion._id, adminNote })

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent bg-base-200 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${TYPE_COLORS[suggestion.type]}`}
            >
              {suggestion.type}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${STATUS_COLORS[suggestion.status]}`}
            >
              {suggestion.status}
            </span>
          </div>
          <p className="mt-1 text-sm font-bold">{suggestion.title}</p>
          <p className="text-xs text-slate-500">
            @{suggestion.user?.username} ·{" "}
            {formatDistanceToNow(new Date(suggestion.createdAt), { addSuffix: true })}
          </p>
        </div>

        <button
          onClick={() => deleteSuggestion(suggestion._id)}
          className="shrink-0 rounded-full p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
        >
          <FaTrash size={12} />
        </button>
      </div>

      {/* Description */}
      <p
        className={`cursor-pointer whitespace-pre-wrap text-sm text-slate-300 ${!expanded ? "line-clamp-3" : ""}`}
        onClick={() => setExpanded((p) => !p)}
      >
        {suggestion.description}
      </p>
      {suggestion.description.length > 150 && (
        <button
          className="self-start text-xs text-primary hover:underline"
          onClick={() => setExpanded((p) => !p)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}

      {/* Attached image */}
      {suggestion.img && (
        <div className="mt-1">
          <img
            src={getOptimizedImageUrl(suggestion.img, "post")}
            alt="Attached screenshot"
            onClick={() => setImgOpen((p) => !p)}
            className={`cursor-zoom-in rounded-xl border border-accent object-contain transition-all ${
              imgOpen ? "max-h-none w-full" : "max-h-40"
            }`}
          />
          <p className="mt-1 text-xs text-slate-600">
            {imgOpen ? "Click to collapse" : "Click to expand"}
          </p>
        </div>
      )}

      {/* Admin controls */}
      <div className="mt-1 flex flex-col gap-2 border-t border-accent/40 pt-3">
        <select
          value={suggestion.status}
          onChange={handleStatusChange}
          disabled={isPending}
          className="select select-bordered select-sm w-full max-w-[180px] rounded-xl"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        <div className="flex items-end gap-2">
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            rows={2}
            placeholder="Add a private note..."
            className="textarea textarea-bordered textarea-sm flex-1 resize-none rounded-xl text-xs"
          />
          <button
            onClick={handleNoteSave}
            disabled={isPending}
            className="btn btn-outline btn-sm rounded-xl"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

const AdminSuggestionsPage = () => {
  const navigate = useNavigate()
  const { authUser } = useAuthUser()
  const [filterStatus, setFilterStatus] = useState("")
  const [filterType, setFilterType] = useState("")
  const [page, setPage] = useState(1)

  const { suggestions, totalPages, total, isLoading } = useGetAllSuggestions({
    status: filterStatus || undefined,
    type: filterType || undefined,
    page,
  })

  if (!authUser?.isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">Access denied.</div>
    )
  }

  return (
    <div className="template min-h-screen flex-1 border-accent md:border-x">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-accent bg-base-100/80 px-4 py-3 backdrop-blur-md">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-2 transition hover:bg-secondary"
        >
          <FaArrowLeft size={15} />
        </button>
        <h1 className="flex-1 text-lg font-bold">Suggestions</h1>
        <span className="text-xs text-slate-500">{total} total</span>
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              setPage(1)
            }}
            className="select select-bordered select-sm rounded-xl"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value)
              setPage(1)
            }}
            className="select select-bordered select-sm rounded-xl"
          >
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="md" />
          </div>
        ) : suggestions.length === 0 ? (
          <p className="py-16 text-center text-slate-500">No suggestions yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {suggestions.map((s) => (
              <SuggestionCard key={s._id} suggestion={s} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-2 flex justify-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn btn-outline btn-sm rounded-full"
            >
              Prev
            </button>
            <span className="flex items-center text-sm text-slate-400">
              {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn btn-outline btn-sm rounded-full"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminSuggestionsPage
