import { useState } from "react"
import LoadingSpinner from "../../../components/common/LoadingSpinner"

// ── Admin form modal ──────────────────────────────────────────────────────────
const EMPTY_FORM = { title: "", body: "", tag: "", isPinned: false }

const DevlogFormModal = ({ initial, onClose, onCreate, onUpdate, isPending }) => {
  const isEditing = !!initial?._id
  const [form, setForm] = useState(initial || EMPTY_FORM)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.title.trim() || !form.body.trim()) return
    if (isEditing) {
      onUpdate({ id: initial._id, ...form })
    } else {
      onCreate(form)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-accent bg-base-200 shadow-2xl">
        <div className="flex items-center justify-between border-b border-accent p-5">
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

export default DevlogFormModal
