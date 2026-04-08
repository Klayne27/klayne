import { useState, useRef, useCallback } from "react"
import { IoClose } from "react-icons/io5"
import { BiImageAdd } from "react-icons/bi"
import { useCreateBoardPost } from "../boardHooks/boardMutations"
import LoadingSpinner from "../../../components/common/LoadingSpinner"

const MAX_IMAGES = 4

const CreateBoardPostModal = ({ onClose }) => {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tagsInput, setTagsInput] = useState("")

  // Each entry: { previewUrl: string, base64: string }
  const [images, setImages] = useState([])

  const fileRef = useRef(null)
  const contentRef = useRef(null)
  const { createBoardPost, isCreating } = useCreateBoardPost()

  // ── Read a File → { previewUrl, base64 } ──────────────────────────────────
  const readFile = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () =>
        resolve({ previewUrl: URL.createObjectURL(file), base64: reader.result })
      reader.readAsDataURL(file)
    })

  // ── File input handler ─────────────────────────────────────────────────────
  const handleFilesChange = async (e) => {
    const files = Array.from(e.target.files || [])
    const remaining = MAX_IMAGES - images.length
    const toAdd = files.slice(0, remaining)
    const results = await Promise.all(toAdd.map(readFile))
    setImages((prev) => [...prev, ...results])
    // reset so the same file can be re-picked
    e.target.value = ""
  }

  // ── Paste handler ──────────────────────────────────────────────────────────
  const handlePaste = useCallback(
    async (e) => {
      if (images.length >= MAX_IMAGES) return
      const items = Array.from(e.clipboardData?.items || [])
      const imageItems = items.filter((item) => item.type.startsWith("image/"))
      if (imageItems.length === 0) return

      e.preventDefault()
      const remaining = MAX_IMAGES - images.length
      const toProcess = imageItems.slice(0, remaining)

      const results = await Promise.all(
        toProcess.map(
          (item) =>
            new Promise((resolve) => {
              const file = item.getAsFile()
              if (!file) return resolve(null)
              const reader = new FileReader()
              reader.onloadend = () =>
                resolve({ previewUrl: URL.createObjectURL(file), base64: reader.result })
              reader.readAsDataURL(file)
            }),
        ),
      )

      setImages((prev) => [...prev, ...results.filter(Boolean)])
    },
    [images.length],
  )

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    const imgs = images.map((img) => img.base64)
    createBoardPost(
      { title, content, imgs: imgs.length > 0 ? imgs : undefined, tags },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-accent bg-base-100 shadow-xl">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-accent px-4 py-3">
          <h2 className="text-lg font-bold">New Board Post</h2>
          <button onClick={onClose} className="rounded-full p-2 transition hover:bg-gray-700">
            <IoClose size={20} />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <input
            type="text"
            placeholder="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg bg-gray-700/30 px-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
            maxLength={200}
            required
          />
          <textarea
            ref={contentRef}
            placeholder="Content (optional) — paste images here too"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={handlePaste}
            rows={8}
            className="w-full resize-none rounded-lg bg-gray-700/30 px-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="text"
            placeholder="Tags (comma-separated, optional)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full rounded-lg bg-gray-700/30 px-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
          />

          {/* Image preview grid */}
          {images.length > 0 && (
            <div
              className={`grid gap-2 ${
                images.length === 1
                  ? "grid-cols-1"
                  : images.length === 2
                    ? "grid-cols-2"
                    : images.length === 3
                      ? "grid-cols-2"
                      : "grid-cols-2"
              }`}
            >
              {images.map((img, index) => (
                <div
                  key={index}
                  className={`relative overflow-hidden rounded-xl border border-accent bg-base-200 ${
                    // Make the first image span full width when there are 3
                    images.length === 3 && index === 0 ? "col-span-2" : ""
                  }`}
                >
                  <img
                    src={img.previewUrl}
                    alt={`preview ${index + 1}`}
                    className="h-40 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80"
                  >
                    <IoClose size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Image count indicator */}
          {images.length > 0 && (
            <p className="text-xs text-slate-500">
              {images.length}/{MAX_IMAGES} images
              {images.length === MAX_IMAGES && " · Maximum reached"}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={images.length >= MAX_IMAGES}
                className="flex items-center gap-1 text-primary transition hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
                title={
                  images.length >= MAX_IMAGES ? "Maximum 4 images reached" : "Add images (max 4)"
                }
              >
                <BiImageAdd size={22} />
              </button>
              <span className="text-xs text-slate-500">or paste from clipboard</span>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              ref={fileRef}
              onChange={handleFilesChange}
            />
            <button
              type="submit"
              disabled={isCreating || !title.trim()}
              className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-white transition hover:bg-primary/80 disabled:bg-slate-600 disabled:text-black"
            >
              {isCreating ? <LoadingSpinner size="xs" /> : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateBoardPostModal
