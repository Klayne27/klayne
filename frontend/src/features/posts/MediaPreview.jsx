import { IoClose } from "react-icons/io5"

export const MediaPreview = ({ previewImage, selectedFile, onRemove }) => {
  if (!previewImage) return null

  return (
    <div className="relative mx-auto max-w-full sm:w-auto">
      <IoClose
        size={25}
        className="absolute -right-2 -top-2 z-10 cursor-pointer rounded-full bg-slate-500 p-1 text-white transition duration-200 hover:bg-slate-600"
        onClick={onRemove}
      />
      {selectedFile?.type.startsWith("image/") ? (
        <img
          src={previewImage}
          className="h-auto max-h-96 w-full rounded object-contain"
          alt="Image preview"
        />
      ) : (
        <video
          controls
          src={previewImage}
          className="h-auto max-h-96 w-full rounded object-contain"
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  )
}
