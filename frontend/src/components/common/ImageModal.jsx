import { IoClose } from "react-icons/io5"
import useLockBodyScroll from "../../hooks/customHooks/useLockBodyScroll"
import { getOptimizedImageUrl } from "../../utils/cloudinaryUtils"

const ImageModal = ({ src, onClose }) => {
  useLockBodyScroll(src)

  if (!src) return null
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-75"
      onClick={onClose}
    >
      <div className="relative max-h-full max-w-full p-4" onClick={(e) => e.stopPropagation()}>
        <img
          src={getOptimizedImageUrl(src, "large")}
          alt="Enlarged"
          className="max-h-[80vh] max-w-full object-contain"
        />
        <button
          className="absolute right-0 top-0 flex size-5 cursor-pointer items-center justify-center rounded-full bg-slate-500 font-bold text-white transition duration-200 hover:bg-slate-600"
          onClick={onClose}
          aria-label="Close"
        >
          <IoClose />
        </button>
      </div>
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 cursor-pointer text-gray-400 hover:underline"
      >
        View original
      </a>
    </div>
  )
}

export default ImageModal
