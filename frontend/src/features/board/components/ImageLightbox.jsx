import { IoClose, IoChevronBack, IoChevronForward } from "react-icons/io5"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils"
import { useEffect } from "react"

const ImageLightbox = ({ images, currentIndex, onClose, onPrev, onNext }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") onNext()
      if (e.key === "ArrowLeft") onPrev()
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onNext, onPrev, onClose])

  if (currentIndex === null) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-base-200/30 backdrop-blur-sm"
      onClick={onClose} // Clicking the background triggers onClose
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute right-5 top-5 z-[110] transition-colors hover:text-primary"
      >
        <IoClose size={40} />
      </button>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <div className="contents">
          <button
            onClick={(e) => {
              e.stopPropagation() // Prevents clicking the arrow from closing the modal
              onPrev()
            }}
            className="absolute left-4 z-[110] rounded-full bg-base-200/70 p-2 transition-colors hover:bg-base-200/80"
          >
            <IoChevronBack size={32} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation() // Prevents clicking the arrow from closing the modal
              onNext()
            }}
            className="absolute right-4 z-[110] rounded-full bg-base-200/70 p-2 transition-colors hover:bg-base-200/80"
          >
            <IoChevronForward size={32} />
          </button>
        </div>
      )}

      {/* Main Image Container */}
      <div
        className="relative z-[105] flex max-h-[90vh] max-w-[90vw] flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={getOptimizedImageUrl(images[currentIndex].imageUrl, "large")}
          alt="Full size"
          className="max-h-[75vh] min-h-0 w-full select-none object-contain shadow-2xl"
        />

        {/* Wrap footer info to ensure it doesn't shrink */}
        <div className="mt-4 flex shrink-0 flex-col items-center">
          {images.length > 1 && (
            <p className="text-sm font-medium text-slate-500">
              {currentIndex + 1} / {images.length}
            </p>
          )}
          <a
            href={images[currentIndex].imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 cursor-pointer text-gray-400 transition-colors hover:text-white hover:underline"
          >
            View original
          </a>
        </div>
      </div>
    </div>
  )
}

export default ImageLightbox
