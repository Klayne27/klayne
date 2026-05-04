import { useState, useRef } from "react"
import { useSubmitSuggestion } from "../suggestionHooks/useSuggestionMutations"
import { useNavigate } from "react-router-dom"
import { FaArrowLeft, FaImage, FaTimes } from "react-icons/fa"
import { usePasteHandler } from "../../../hooks/customHooks/usePasteHandler"

const TYPES = [
  { value: "feature", label: "Feature Request" },
  { value: "bug", label: "Bug Report" },
  { value: "idea", label: "Idea" },
  { value: "other", label: "Other" },
]

const EMPTY_FORM = { type: "feature", title: "", description: "", img: null }

const SuggestionForm = () => {
  const { submitSuggestion, isPending } = useSubmitSuggestion()
  const [form, setForm] = useState(EMPTY_FORM)
  const [imgPreview, setImgPreview] = useState(null)

  const fileInputRef = useRef(null)
  // 2. Create a ref for the textarea
  const descriptionRef = useRef(null)

  const navigate = useNavigate()

  // 3. Initialize the paste handler
  const handlePaste = usePasteHandler({
    inputRef: descriptionRef,
    input: form.description,
    // Provide a setter that updates only the description in our form object
    setInput: (newText) => setForm((prev) => ({ ...prev, description: newText })),
    // We'll handle the actual file-to-base64 conversion in the callback below
    setSelectedFile: () => {},
    setPreviewImage: setImgPreview,
    fileInputRef: fileInputRef,
    onImagePasted: (file) => {
      const reader = new FileReader()
      reader.onload = () => setForm((prev) => ({ ...prev, img: reader.result }))
      reader.readAsDataURL(file)
    },
  })

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImgPreview(URL.createObjectURL(file))
    const reader = new FileReader()
    reader.onload = () => setForm((prev) => ({ ...prev, img: reader.result }))
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImgPreview(null)
    setForm((prev) => ({ ...prev, img: null }))
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.description.trim()) return
    submitSuggestion(form, {
      onSuccess: () => {
        setForm(EMPTY_FORM)
        setImgPreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
      },
    })
  }

  return (
    <div className="template min-h-screen flex-1 border-accent md:border-x">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-accent bg-opacity-20 px-3 py-2 backdrop-blur-md md:gap-4 md:px-4 md:py-3.5">
        <button
          onClick={() => navigate(-1)}
          className="flex-shrink-0 rounded-full p-2.5 transition duration-200 hover:bg-gray-800"
        >
          <FaArrowLeft />
        </button>
        <h1 className="flex-1 truncate text-xl font-bold">Share a suggestion</h1>
      </div>

      <div className="mx-auto max-w-xl px-4 pb-10">
        <p className="mb-4 text-sm text-slate-500">
          Got an idea, spotted a bug, or want a feature? Let me know.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Type pills */}
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                type="button"
                key={t.value}
                onClick={() => setForm((p) => ({ ...p, type: t.value }))}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  form.type === t.value
                    ? "bg-primary"
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
              ref={descriptionRef}
              onPaste={handlePaste}
              value={form.description}
              onChange={handleChange}
              maxLength={1000}
              rows={5}
              placeholder="What's on your mind? Don't hold back—describe the feature of your dreams or a bug that's bugging you. (You can paste images here!)"
              className="textarea textarea-bordered w-full resize-none rounded-xl"
              required
            />
            <span className="self-end text-xs text-slate-500">{form.description.length}/1000</span>
          </div>

          {/* Image attachment */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-400">
              Screenshot <span className="text-slate-600">(optional)</span>
            </label>

            {imgPreview ? (
              /* Preview with remove button */
              <div className="relative w-fit">
                <img
                  src={imgPreview}
                  alt="Preview"
                  className="max-h-60 rounded-xl border border-accent object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
                >
                  <FaTimes size={12} />
                </button>
              </div>
            ) : (
              /* Upload trigger */
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-fit items-center gap-2 rounded-xl border border-dashed border-accent px-4 py-2.5 text-sm text-slate-400 transition hover:border-primary hover:text-primary"
              >
                <FaImage size={16} />
                Attach image
              </button>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          <div className="flex justify-start">
            <button
              type="submit"
              disabled={isPending || !form.title.trim() || !form.description.trim()}
              className="rounded-full bg-primary px-4 py-2 font-semibold"
            >
              {isPending ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SuggestionForm
