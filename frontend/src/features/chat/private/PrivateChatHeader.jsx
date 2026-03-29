import { FaArrowLeft } from "react-icons/fa6"
import { Link, useNavigate } from "react-router-dom"
import { useSocket } from "../../../context/SocketContext"
import { RiPushpinFill } from "react-icons/ri"
import { truncateText } from "../../../utils/truncateText"
import { CiCircleInfo } from "react-icons/ci"
import { IoInformationCircleOutline } from "react-icons/io5"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils"

function PrivateChatHeader({ otherUser, onOpenPinnedModal, selectedConversation }) {
  const navigate = useNavigate()
  const { onlineUsers } = useSocket()

  const isOnline = onlineUsers.includes(otherUser?._id)
  const groupAvatar = selectedConversation.avatar?.imageUrl || "/avatar-placeholder.png"
  const groupName = selectedConversation.name
  const otherUserProfileImg = otherUser?.profileImg?.imageUrl || "/avatar-placeholder.png"
  const otherUserName = otherUser?.username
  const isGroup = selectedConversation.isGroup

  const handleBackToConversations = () => {
    navigate(-1)
  }

  return (
    <div className="fixed top-0 z-10 flex w-full items-center justify-between border-accent bg-black bg-opacity-20 px-4 py-3 shadow-lg backdrop-blur-md md:w-[547px]">
      <button
        onClick={handleBackToConversations}
        className="mr-2 flex-shrink-0 rounded-full p-2.5 transition duration-200 hover:bg-gray-800 hover:text-white md:hidden"
      >
        <FaArrowLeft />
      </button>
      <div className="flex">
        <Link to={!isGroup && `/profile/${otherUser?.username}`} className="relative">
          <img
            src={getOptimizedImageUrl(isGroup ? groupAvatar : otherUserProfileImg, "avatar")}
            alt={isGroup ? groupName : otherUserName}
            className="mr-2 h-8 w-8 rounded-full object-cover"
          />
          {isGroup ? (
            <span className="absolute bottom-0 right-1 flex h-3 w-3 items-center justify-center rounded-full border border-base-100 bg-primary text-[8px] text-white">
              G
            </span>
          ) : isOnline ? (
            <span className="absolute bottom-0 right-1 h-3 w-3 rounded-full border-2 border-base-100 bg-green-500"></span>
          ) : (
            <span className="absolute bottom-0 right-1 h-3 w-3 rounded-full border-2 border-base-100 bg-gray-500"></span>
          )}
        </Link>
        <div className="flex flex-col">
          <div className="flex items-center">
            <h3 className="mr-1 text-lg font-bold">{isGroup ? groupName : otherUser?.fullName}</h3>
            {!isGroup && (
              <>
                {" "}
                {otherUser?.isVerified && (
                  <img src="/verified2.png" className="size-[17px]" alt="Verified badge" />
                )}
                {otherUser?.isGoldVerified && (
                  <img src="/gold-verified2.png" className="size-[17px]" alt="Verified badge" />
                )}
              </>
            )}
          </div>
          {/* <span className="text-xs text-slate-500">
            {isGroup && truncateText(selectedConversation.description, 30)}
          </span> */}
        </div>
      </div>

      <div className="flex">
        {isGroup && (
          <button
            className="ml-auto mr-2 rounded-full p-2.5 transition duration-200 hover:bg-gray-800"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/messages/${selectedConversation._id}/settings`)
            }}
          >
            <IoInformationCircleOutline size={20} />
          </button>
        )}
        <button
          onClick={onOpenPinnedModal}
          className="ml-auto mr-2 rounded-full p-2.5 transition duration-200 hover:bg-gray-800"
          title="View Pinned Messages"
        >
          <RiPushpinFill size={20} />
        </button>
      </div>
    </div>
  )
}

export default PrivateChatHeader
