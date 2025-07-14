import { FaArrowLeft } from "react-icons/fa6";
import { Link } from "react-router-dom";

function ChatHeader({ onBackToConversations, otherUser }) {
  return (
    <div className="fixed top-0 w-full md:w-[586px] border-accent z-10 px-4 py-3 shadow-lg flex items-center bg-opacity-20 backdrop-blur-md bg-black md:border-r">
      {onBackToConversations && (
        <button
          onClick={onBackToConversations}
          className="md:hidden mr-2 hover:bg-gray-800 rounded-full p-2.5 transition duration-200 flex-shrink-0"
        >
          <FaArrowLeft />
        </button>
      )}
      <Link to={`/profile/${otherUser?.username}`}>
        <img
          src={otherUser?.profileImg || "/avatar-placeholder.png"}
          alt={otherUser?.username}
          className="w-8 h-8 rounded-full object-cover mr-2"
        />
      </Link>
      <h3 className="text-lg font-bold">{otherUser?.fullName}</h3>
      {otherUser?.isVerified && (
        <img src="/verified.png" className="size-[17px] ml-1" alt="Verified badge" />
      )}
    </div>
  );
}

export default ChatHeader;
