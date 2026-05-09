import { IoClose, IoChevronBack, IoChevronForward } from "react-icons/io5"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils"
import { useEffect, useState, useRef } from "react"

const ImageLightbox = ({ images, currentIndex, onClose, onPrev, onNext }) => {
  const [isZoomed, setIsZoomed] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [startPan, setStartPan] = useState({ x: 0, y: 0 })
  const [dragDistance, setDragDistance] = useState(0) // Track movement to distinguish click vs drag
  const imageRef = useRef(null)

  useEffect(() => {
    setIsZoomed(false)
    setPosition({ x: 0, y: 0 })
  }, [currentIndex])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") onNext()
      if (e.key === "ArrowLeft") onPrev()
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onNext, onPrev, onClose])

  const handleImageInteraction = (e) => {
    e.stopPropagation()

    // If the user moved the mouse more than 5px, it was a drag, not a click.
    if (dragDistance > 5) {
      setDragDistance(0)
      return
    }

    if (isZoomed) {
      setIsZoomed(false)
      setPosition({ x: 0, y: 0 })
    } else {
      // --- ZOOM TO CLICK LOGIC ---
      const rect = imageRef.current.getBoundingClientRect()

      // Calculate click position relative to the image center (0,0)
      // We multiply by the scale factor to offset the container correctly
      const offsetX = rect.left + rect.width / 2 - e.clientX
      const offsetY = rect.top + rect.height / 2 - e.clientY

      setPosition({ x: offsetX * 1.5, y: offsetY * 1.5 })
      setIsZoomed(true)
    }
    setDragDistance(0)
  }

  const handleMouseDown = (e) => {
    if (!isZoomed) return
    e.preventDefault()
    setIsDragging(true)
    setDragDistance(0)
    setStartPan({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e) => {
    if (!isDragging || !isZoomed) return

    const newX = e.clientX - startPan.x
    const newY = e.clientY - startPan.y

    // Calculate total distance moved
    setDragDistance((prev) => prev + Math.abs(e.movementX) + Math.abs(e.movementY))

    setPosition({ x: newX, y: newY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  if (currentIndex === null) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-base-200/30 backdrop-blur-sm transition-all ${
        isDragging ? "cursor-grabbing" : "cursor-default"
      }`}
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <button
        onClick={onClose}
        className="absolute right-5 top-5 z-[110] text-white/50 hover:text-primary"
      >
        <IoClose size={40} />
      </button>

      {images.length > 1 && !isZoomed && (
        <div className="contents">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPrev()
            }}
            className="absolute left-4 z-[110] rounded-full bg-base-200/70 p-2 hover:bg-base-200/80"
          >
            <IoChevronBack size={32} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onNext()
            }}
            className="absolute right-4 z-[110] rounded-full bg-base-200/70 p-2 hover:bg-base-200/80"
          >
            <IoChevronForward size={32} />
          </button>
        </div>
      )}

      <div
        className="relative z-[105] flex h-full w-full items-center justify-center overflow-hidden"
        // onClick={(e) => e.stopPropagation()}
      >
        <img
          ref={imageRef}
          src={getOptimizedImageUrl(images[currentIndex].imageUrl, "large")}
          alt="Full size"
          draggable={false}
          onMouseDown={handleMouseDown}
          onClick={handleImageInteraction}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${isZoomed ? 2.5 : 1})`,
            transition: isDragging ? "none" : "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)", // Smoother "Discord-like" ease
            transformOrigin: "center",
          }}
          className={`max-h-[85vh] max-w-[90vw] select-none object-contain shadow-2xl transition-opacity duration-300 ${
            isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"
          }`}
        />

        {/* {!isZoomed && (
          <div className="pointer-events-none absolute bottom-10 flex flex-col items-center">
            {images.length > 1 && (
              <p className="text-sm font-medium text-white/70">
                {currentIndex + 1} / {images.length}
              </p>
            )}
            <a
              href={images[currentIndex].imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto text-xs text-white/40 hover:text-white hover:underline"
            >
              View original
            </a>
          </div>
        )} */}
      </div>
    </div>
  )
}

export default ImageLightbox
