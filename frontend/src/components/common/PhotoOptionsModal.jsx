import { createPortal } from "react-dom"
import { TbCameraPlus, TbTrash } from "react-icons/tb"
import { IoClose } from "react-icons/io5"

/**
 * PhotoOptionsModal
 *
 * Props:
 *  isOpen        – boolean
 *  onClose       – () => void
 *  onUpload      – () => void   (triggers the hidden file input)
 *  onRemove      – () => void   (calls the remove mutation)
 *  hasPhoto      – boolean      (hides "Remove" when there's no photo to remove)
 *  isRemoving    – boolean      (shows loading state on Remove button)
 *  title         – string       (e.g. "Profile Photo" | "Cover Photo")
 */
const PhotoOptionsModal = ({
  isOpen,
  onClose,
  onUpload,
  onRemove,
  hasPhoto = false,
  isRemoving = false,
  title = "Photo",
}) => {
  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-gray-700/70  sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-t-3xl bg-base-100 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-base-300" />
        </div>

        {/* Title */}
        <div className="px-6 pb-2 pt-4 text-center sm:pt-6">
          <p className="text-sm font-black uppercase tracking-widest text-slate-500">{title}</p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-1 px-4 pb-4">
          {/* Upload */}
          <button
            onClick={() => {
              onUpload()
              onClose()
            }}
            className="flex items-center gap-4 rounded-2xl px-4 py-3.5 text-left font-semibold transition hover:bg-secondary/50 active:bg-base-300"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <TbCameraPlus size={20} />
            </span>
            <span>Upload photo</span>
          </button>

          {/* Remove — only shown when a photo exists */}
          {hasPhoto && (
            <button
              onClick={() => {
                onRemove()
                onClose()
              }}
              disabled={isRemoving}
              className="flex items-center gap-4 rounded-2xl px-4 py-3.5 text-left font-semibold text-error transition hover:bg-error/10 active:bg-error/20 disabled:opacity-50"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-error/10 text-error">
                <TbTrash size={20} />
              </span>
              <span>{isRemoving ? "Removing…" : "Remove photo"}</span>
            </button>
          )}

          {/* Cancel */}
          <button
            onClick={onClose}
            className="mt-1 flex items-center gap-4 rounded-2xl px-4 py-3.5 text-left font-semibold text-slate-400 transition hover:bg-secondary/50 active:bg-base-300"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-base-200">
              <IoClose size={20} />
            </span>
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default PhotoOptionsModal
