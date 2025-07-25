import { IoClose } from "react-icons/io5";

const ImageModal = ({ src, onClose }) => {
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-75"
      onClick={onClose}
    >
      <div
        className="relative max-w-full max-h-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt="Enlarged"
          className="max-w-full max-h-[80vh] object-contain"
        />
        <button
          className="absolute top-0 right-0 text-white  font-bold bg-gray-500 duration-200 transition hover:bg-gray-600 rounded-full size-5 flex items-center justify-center cursor-pointer"
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
        className="text-gray-400 hover:underline cursor-pointer mt-4"
      >
        View original
      </a>
    </div>
  );
};

export default ImageModal;
