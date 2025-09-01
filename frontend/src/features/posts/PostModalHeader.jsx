import { IoClose } from "react-icons/io5";

export const PostModalHeader = ({ title, onClose }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-5">
      <button
        className="rounded-full p-1 transition duration-200 hover:bg-secondary"
        onClick={onClose}
      >
        <IoClose strokeWidth={1} size={24} />
      </button>
      <h2 className="text-xl font-bold">{title}</h2>
    </div>
  </div>
)
