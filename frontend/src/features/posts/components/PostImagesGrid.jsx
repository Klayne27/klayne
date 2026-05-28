// src/features/posts/components/PostImagesGrid.jsx
import { useLightboxStore } from "../../../store/useLightboxStore"

const PostImagesGrid = ({ images = [] }) => {
  const openLightbox = useLightboxStore((s) => s.openLightbox)
  const count = images.length
  if (count === 0) return null

  const open = (index, e) => {
    e.stopPropagation()
    openLightbox({ images, index })
  }

  const imgClass =
    "h-full w-full cursor-pointer transition-opacity hover:opacity-90 select-none"

  // 1 Image: Maintain original max-h-80
  if (count === 1) {
    return (
      <div className="max-h-80 overflow-hidden rounded-2xl border border-accent">
        <img
          src={images[0].imageUrl}
          onClick={(e) => open(0, e)}
          className={`${imgClass} max-h-80 w-full object-contain`}
          loading="lazy"
          alt="post image"
        />
      </div>
    )
  }

  // 2 Images: Updated to h-80
  if (count === 2) {
    return (
      <div className="grid h-80 grid-cols-2 gap-0.5 overflow-hidden rounded-2xl border border-accent">
        {images.map((img, i) => (
          <img
            key={i}
            src={img.imageUrl}
            onClick={(e) => open(i, e)}
            className={`${imgClass} object-cover`}
            loading="lazy"
            alt={`post image ${i + 1}`}
          />
        ))}
      </div>
    )
  }

  // 3 Images: Updated to h-80
  if (count === 3) {
    return (
      <div className="grid h-80 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-2xl border border-accent">
        <img
          src={images[0].imageUrl}
          onClick={(e) => open(0, e)}
          className={`${imgClass} row-span-2`}
          loading="lazy"
          alt="post image 1"
        />
        <img
          src={images[1].imageUrl}
          onClick={(e) => open(1, e)}
          className={imgClass}
          loading="lazy"
          alt="post image 2"
        />
        <img
          src={images[2].imageUrl}
          onClick={(e) => open(2, e)}
          className={imgClass}
          loading="lazy"
          alt="post image 3"
        />
      </div>
    )
  }

  // 4 Images: Updated to h-80 and forced 2x2 grid symmetry
  return (
    <div className="grid h-80 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-2xl border border-accent">
      {images.map((img, i) => (
        <img
          key={i}
          src={img.imageUrl}
          onClick={(e) => open(i, e)}
          className={imgClass}
          loading="lazy"
          alt={`post image ${i + 1}`}
        />
      ))}
    </div>
  )
}

export default PostImagesGrid
