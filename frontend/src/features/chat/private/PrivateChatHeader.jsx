import { FaArrowLeft } from "react-icons/fa6"
import { Link, useNavigate } from "react-router-dom"
import { useSocket } from "../../../context/SocketContext"
import { RiPushpinFill, RiPushpinLine } from "react-icons/ri"

function PrivateChatHeader({ otherUser, onOpenPinnedModal }) {
  const navigate = useNavigate()
  const { onlineUsers } = useSocket()

  const isOnline = onlineUsers.includes(otherUser?._id)

  const handleBackToConversations = () => {
    navigate(-1)
  }

  return (
    <div className="fixed top-0 z-10 flex w-full items-center border-accent bg-black bg-opacity-20 px-4 py-3 shadow-lg backdrop-blur-md md:w-[547px]">
      <button
        onClick={handleBackToConversations}
        className="mr-2 flex-shrink-0 rounded-full p-2.5 transition duration-200 hover:bg-gray-800 hover:text-white md:hidden"
      >
        <FaArrowLeft />
      </button>

      <Link to={`/profile/${otherUser?.username}`} className="relative">
        <img
          src={otherUser?.profileImg?.imageUrl || "/avatar-placeholder.png"}
          alt={otherUser?.username}
          className="mr-2 h-8 w-8 rounded-full object-cover"
        />
        {isOnline ? (
          <span className="absolute bottom-0 right-1 h-3 w-3 rounded-full border-2 border-base-100 bg-green-500"></span>
        ) : (
          <span className="absolute bottom-0 right-1 h-3 w-3 rounded-full border-2 border-base-100 bg-gray-500"></span>
        )}
      </Link>
      <h3 className="text-lg font-bold">{otherUser?.fullName}</h3>
      {otherUser?.isVerified && (
        <img src="/verified2.png" className="ml-1 size-[17px]" alt="Verified badge" />
      )}
      {otherUser?.isGoldVerified && (
        <img src="/gold-verified2.png" className="ml-1 size-[17px]" alt="Verified badge" />
      )}

      <button
        onClick={onOpenPinnedModal}
        className="ml-auto mr-2 rounded-full p-2.5 transition duration-200 hover:bg-gray-800"
        title="View Pinned Messages"
      >
        <RiPushpinFill size={20} />
      </button>
    </div>
  )
}

export default PrivateChatHeader
