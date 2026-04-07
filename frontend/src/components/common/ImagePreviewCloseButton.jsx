import { IoClose } from "react-icons/io5"

function ImagePreviewCloseButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute -right-2 -top-2 rounded-full bg-base-300 p-1 text-red-500 shadow-sm hover:bg-base-200"
    >
      <IoClose size={16} />
    </button>
  )
}

export default ImagePreviewCloseButton
