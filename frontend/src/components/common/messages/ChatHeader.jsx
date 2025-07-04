import { BiArrowBack } from "react-icons/bi";
import { Link } from "react-router-dom";

function ChatHeader({ onBackToConversations, otherUser }) {
  return (
    <div className="fixed top-0 w-[625px] border-gray-700 z-20 p-4 shadow-lg flex items-center bg-opacity-20 backdrop-blur-md ">
      {onBackToConversations && (
        <button onClick={onBackToConversations} className="md:hidden mr-2 text-white">
          <BiArrowBack className="w-6 h-6" />
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
