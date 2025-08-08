import { useParams, useNavigate } from "react-router-dom"
import { FaArrowLeft } from "react-icons/fa6"
import { useImage } from "../../hooks/imageHooks/useImage"
import LoadingSpinner from "../ui/LoadingSpinner"

const ImageViewerPage = () => {
  const { imageId } = useParams()
  const navigate = useNavigate()

  const { image, isLoading, isError, error } = useImage(imageId)

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-white">
        <LoadingSpinner />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-screen items-center justify-center text-white">
        Error: {error.message}
      </div>
    )
  }

  if (!image?.imageUrl) {
    return (
      <div className="flex h-screen items-center justify-center text-white">Image not found.</div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex h-screen flex-col items-center justify-center bg-black">
      <button
        onClick={() => navigate(-1)}
        className="absolute left-4 top-3.5 flex-shrink-0 rounded-full p-2.5 transition duration-200 hover:bg-gray-800 bg-gray-800/50"
        aria-label="Go back"
      >
        <FaArrowLeft />
      </button>
      <img src={image.imageUrl} alt="Enlarged" className="max-h-full max-w-full object-contain" />
    </div>
  )
}

export default ImageViewerPage
