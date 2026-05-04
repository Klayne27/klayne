// src/features/suggestions/SuggestionForm.jsx
import { useState } from "react"
import { useSubmitSuggestion } from "../suggestionHooks/useSuggestionMutations"
import { useNavigate } from "react-router-dom"
import { FaArrowLeft } from "react-icons/fa"

const TYPES = [
  { value: "feature", label: "Feature Request" },
  { value: "bug", label: "Bug Report" },
  { value: "idea", label: "Idea" },
  { value: "other", label: "Other" },
]

const SuggestionForm = () => {
  const { submitSuggestion, isPending } = useSubmitSuggestion()
  const [form, setForm] = useState({ type: "feature", title: "", description: "" })
  const navigate = useNavigate()

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.description.trim()) return
    submitSuggestion(form, {
      onSuccess: () => setForm({ type: "feature", title: "", description: "" }),
    })
  }

  return (
    <div className="template min-h-screen flex-1 border-accent md:border-x">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-accent bg-opacity-20 px-3 py-2 backdrop-blur-md md:gap-4 md:px-4 md:py-3.5">
        <button
          onClick={() => navigate(-1)}
          className="flex-shrink-0 rounded-full p-2.5 transition duration-200 hover:bg-gray-800"
        >
          <FaArrowLeft />
        </button>
        <h1 className="flex-1 truncate text-xl font-bold">Share a suggestion</h1>
      </div>

      <div className="mx-auto max-w-xl px-4">
        <p className="mb-4 text-sm text-slate-500">
          Got an idea, spotted a bug, or want a feature? Let me know.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Type */}
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                type="button"
                key={t.value}
                onClick={() => setForm((p) => ({ ...p, type: t.value }))}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  form.type === t.value
                    ? "bg-primary text-white"
                    : "bg-base-200 text-slate-400 hover:bg-secondary"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-400">Title</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              maxLength={100}
              placeholder="Short summary"
              className="input input-bordered w-full rounded-xl"
              required
            />
            <span className="self-end text-xs text-slate-500">{form.title.length}/100</span>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-400">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              maxLength={1000}
              rows={5}
              placeholder="Tell me more..."
              className="textarea textarea-bordered w-full resize-none rounded-xl"
              required
            />
            <span className="self-end text-xs text-slate-500">{form.description.length}/1000</span>
          </div>

          <button
            type="submit"
            disabled={isPending || !form.title.trim() || !form.description.trim()}
            className="btn btn-primary rounded-full"
          >
            {isPending ? "Submitting..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default SuggestionForm
