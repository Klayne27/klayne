import { useState, useRef } from "react"
import { IoClose } from "react-icons/io5"
import { BiImageAdd } from "react-icons/bi"
import { useCreateBoardPost } from "../boardHooks/boardMutations"
import LoadingSpinner from "../../../components/common/LoadingSpinner"

const CreateBoardPostModal = ({ onClose }) => {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tagsInput, setTagsInput] = useState("")
  const [previewImg, setPreviewImg] = useState(null)
  const [imgBase64, setImgBase64] = useState(null)
  const fileRef = useRef(null)
  const { createBoardPost, isCreating } = useCreateBoardPost()

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPreviewImg(URL.createObjectURL(file))
    const reader = new FileReader()
    reader.onloadend = () => setImgBase64(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    createBoardPost({ title, content, img: imgBase64 || undefined, tags }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-accent bg-base-100 shadow-xl">
        <div className="flex items-center justify-between border-b border-accent px-4 py-3">
          <h2 className="text-lg font-bold">New Board Post</h2>
          <button onClick={onClose} className="rounded-full p-2 transition hover:bg-gray-700">
            <IoClose size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
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
            placeholder="Content (optional)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-lg bg-gray-700/30 px-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="text"
            placeholder="Tags (comma-separated, optional)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full rounded-lg bg-gray-700/30 px-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
          />

          {previewImg && (
            <div className="relative w-fit">
              <img src={previewImg} className="max-h-40 rounded-xl object-contain" alt="preview" />
              <button
                type="button"
                onClick={() => {
                  setPreviewImg(null)
                  setImgBase64(null)
                }}
                className="absolute -right-2 -top-2 rounded-full bg-slate-600 p-1 text-white hover:bg-slate-500"
              >
                <IoClose size={14} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1 text-primary transition hover:text-primary/80"
            >
              <BiImageAdd size={22} />
            </button>
            <input type="file" accept="image/*" hidden ref={fileRef} onChange={handleImageChange} />
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
