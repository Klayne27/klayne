import { IoClose, IoChevronBack, IoChevronForward } from "react-icons/io5"

const ImageLightbox = ({ images, currentIndex, onClose, onPrev, onNext }) => {
  if (currentIndex === null) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-base-200/30 backdrop-blur-sm"
      onClick={onClose} // Clicking the background triggers onClose
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute right-5 top-5 z-[110] text-white transition-colors hover:text-primary"
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
            className="absolute left-4 z-[110] rounded-full bg-slate-500/50 p-2 transition-colors hover:bg-slate-500/60"
          >
            <IoChevronBack size={32} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation() // Prevents clicking the arrow from closing the modal
              onNext()
            }}
            className="absolute right-4 z-[110] rounded-full bg-slate-500/50 p-2 transition-colors hover:bg-slate-500/60"
          >
            <IoChevronForward size={32} />
          </button>
        </div>
      )}

      {/* Main Image Container */}
      <div
        className="relative z-[105] flex max-h-[85vh] max-w-[90vw] flex-col items-center"
        onClick={(e) => e.stopPropagation()} // Prevents clicking the image area from closing the modal
      >
        <img
          src={images[currentIndex].imageUrl}
          alt="Full size"
          className="max-h-full max-w-full select-none object-contain shadow-2xl"
        />
        <p className="mt-4 text-sm font-medium text-white/60">
          {currentIndex + 1} / {images.length}
        </p>
      </div>
    </div>
  )
}

export default ImageLightbox
