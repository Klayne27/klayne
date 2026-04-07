import ImagePreviewCloseButton from "../../../components/common/ImagePreviewCloseButton"

export const MediaPreview = ({ previewImage, selectedFile, onRemove }) => {
  if (!previewImage) return null

  return (
    <div className="relative mx-auto max-w-full sm:w-auto">
      <ImagePreviewCloseButton onClick={onRemove} />
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
