import { FaArrowLeft } from "react-icons/fa6"
import { Link, useNavigate } from "react-router-dom"
import { useSocket } from "../../../../context/SocketContext"
import { RiPushpinFill } from "react-icons/ri"
import { IoInformationCircleOutline } from "react-icons/io5"
import { getOptimizedImageUrl } from "../../../../utils/cloudinaryUtils"
import UserFullName from "../../../../components/common/UserFullname"

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
    navigate("/messages")
  }

  return (
    <div className="fixed top-0 z-20 flex w-full items-center justify-between border-accent bg-base-200 bg-opacity-20 px-4 py-3 shadow-lg backdrop-blur-md md:w-[809px]">
      {/* Added 'min-w-0' and 'flex-1' to the left side container 
         to ensure it takes up space but allows shrinking.
      */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          onClick={handleBackToConversations}
          className="mr-2 flex-shrink-0 rounded-full p-2.5 transition duration-200 hover:bg-gray-800 hover:text-white md:hidden"
        >
          <FaArrowLeft />
        </button>

        <div className="flex min-w-0 flex-1 items-center">
          <Link
            to={!isGroup && `/profile/${otherUser?.username}`}
            className="relative flex-shrink-0"
          >
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

          {/* Key Fix: Added 'min-w-0' here so the flex-col can shrink
           */}
          <div className="flex min-w-0 flex-col overflow-hidden">
            <div className="flex min-w-0 items-center">
              {/* <h3 className="mr-1 min-w-0 truncate text-lg font-bold">
                {isGroup ? groupName : otherUser?.fullName}
              </h3> */}
              {isGroup ? (
                <h3 className="mr-1 min-w-0 truncate text-lg font-bold">{groupName}</h3>
              ) : (
                <UserFullName
                  user={otherUser}
                  className={`mr-1 cursor-pointer font-semibold`}
                  style={otherUser?.nameColor ? { color: otherUser?.nameColor } : undefined}
                />
              )}
              {!isGroup && (
                <div className="flex flex-shrink-0 items-center gap-1">
                  {otherUser?.isVerified && (
                    <img src="/verified2.png" className="size-[17px]" alt="Verified" />
                  )}
                  {otherUser?.isGoldVerified && (
                    <img src="/gold-verified2.png" className="size-[17px]" alt="Gold" />
                  )}
                  {otherUser.isCha && <img src="/cha.png" className="size-[15px] rounded-md" />}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center">
        {isGroup && (
          <button
            className="rounded-full p-2.5 transition duration-200 hover:bg-gray-800"
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
          className="rounded-full p-2.5 transition duration-200 hover:bg-gray-800"
          title="View Pinned Messages"
        >
          <RiPushpinFill size={20} />
        </button>
      </div>
    </div>
  )
}

export default PrivateChatHeader
