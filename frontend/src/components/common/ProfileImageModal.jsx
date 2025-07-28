import { IoClose } from "react-icons/io5";

const ProfileImageModal = ({ src, onClose }) => {
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-75"
      onClick={onClose}
    >
      <div className="avatar">
        <div
          className="w-[500px] rounded-full relative group/avatar"
          onClick={(e) => e.stopPropagation()}
        >
          <img src={src} alt="Enlarged" className="" />
          <button
            className="absolute top-0 right-0 text-white  font-bold bg-slate-500 duration-200 transition hover:bg-slate-600 rounded-full size-5 flex items-center justify-center cursor-pointer"
            onClick={onClose}
            aria-label="Close"
          >
            <IoClose />
          </button>
        </div>
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

export default ProfileImageModal;
