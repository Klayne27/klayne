import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { MdImage } from "react-icons/md"
import { PiMicrophoneStageFill } from "react-icons/pi"
import { BsThreeDots } from "react-icons/bs"
import { FaTrashCan } from "react-icons/fa6"
import { FaDoorOpen } from "react-icons/fa6"
import { IoSettingsOutline } from "react-icons/io5"
import { useAuthUser } from "../../../auth/authHooks/useAuthUser"
import { usePrivateChatStore } from "../../../../store/usePrivateChatStore"
import { getOptimizedImageUrl } from "../../../../utils/cloudinaryUtils"
import { formatPostDate } from "../../../../utils/date"
import DropdownMenu from "../../../../components/common/DropdownMenu"
import ConfirmationModal from "../../../../components/common/ConfirmationModal"
import useMobileConversationLongPress from "../../../../hooks/customHooks/useMobileConversationLongPress"
import SlideUpMenu from "../../../../components/common/SlideUpMenu"
import { TbUser } from "react-icons/tb"
import { useDeleteGroup, useLeaveGroup } from "../groupChatHooks/useGroupMutations"

function GroupConversationItem({ conv }) {
  const { authUser: currentUser } = useAuthUser()
  const navigate = useNavigate()
  const selectedConversation = usePrivateChatStore((state) => state.selectedConversation)
  const setReplyingToMessage = usePrivateChatStore((state) => state.setReplyingToMessage)
  const setAudioBlob = usePrivateChatStore((state) => state.setAudioBlob)

  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const { leaveGroup, isLeavingGroup } = useLeaveGroup()
  const { deleteGroup, isDeletingGroup } = useDeleteGroup()

  const {
    activeConversationId,
    // setActiveConversationId,
    handleCloseMenu,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    handleTouchCancel,
    isMobile,
  } = useMobileConversationLongPress()

  const isMenuOpen = activeConversationId === conv._id

  const isSelected = selectedConversation?._id === conv._id

  const myMember = conv.members?.find(
    (m) => (m.user?._id || m.user)?.toString() === currentUser._id.toString(),
  )
  const isOwner = myMember?.role === "owner"
  const isAdmin = myMember?.role === "admin" || isOwner

  const isLastMessageUnread =
    conv.lastMessage?.sender?._id.toString() !== currentUser._id.toString() &&
    !conv.lastMessage?.seen

  let lastMessageContent = "No messages yet..."
  if (conv.lastMessage?.img) {
    lastMessageContent = (
      <span>
        <MdImage className="inline-block text-lg" /> Image
      </span>
    )
  } else if (conv.lastMessage?.audio) {
    lastMessageContent = (
      <span>
        <PiMicrophoneStageFill className="inline-block text-sm" /> Voice Message
      </span>
    )
  } else if (conv.lastMessage?.text) {
    lastMessageContent = conv.lastMessage.text
  }

  const truncated =
    typeof lastMessageContent === "string" && lastMessageContent.length > 35
      ? lastMessageContent.slice(0, 35) + "..."
      : lastMessageContent

  const handleSelect = () => {
    navigate(`/messages/${conv._id}`)
    setReplyingToMessage(null)
    setAudioBlob(null)
  }

   const handleTouchStartWithId = (e) => {
     e.convId = conv._id // Pass the conversation ID to the long press hook
     handleTouchStart(e)
   }

  return (
    <>
      <div
        className={`flex cursor-pointer items-center gap-1 p-3 transition-colors duration-300 hover:bg-secondary/60 ${
          isSelected ? "border-r-2 border-r-primary bg-secondary" : ""
        }`}
        onClick={handleSelect}
        onTouchStart={handleTouchStartWithId}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchCancel={handleTouchCancel}
      >
        {/* Avatar */}
        <div className="relative shrink-0 p-1 ">
          <img
            src={getOptimizedImageUrl(conv.avatar?.imageUrl || "/avatar-placeholder.png", "avatar")}
            alt={conv.name}
            className="h-8 w-8 rounded-full object-cover"
          />
          {/* Group icon badge */}
          <span className="absolute bottom-0 right-0.5 flex h-3 w-3 items-center justify-center rounded-full border border-base-100 bg-primary text-[8px] ">
            G
          </span>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center">
            <span className="truncate font-bold">{conv.name}</span>
            <span className="mx-1 text-xs text-gray-400">·</span>
            <span className="shrink-0 text-xs text-gray-400">{formatPostDate(conv.updatedAt)}</span>
          </div>
          <div className="flex items-center">
            <p
              className={`truncate text-sm ${isLastMessageUnread ? "font-semibold" : "text-gray-400"}`}
            >
              {isLastMessageUnread && <span className="mr-1 text-blue-500">●</span>}

              {lastMessageContent === "No messages yet..." ? (
                <span className="italic">{lastMessageContent}</span>
              ) : (
                <span>
                  {conv?.lastMessage?.sender?.username}: {truncated}
                </span>
              )}
            </p>
          </div>
        </div>

        {!isMobile && (
          <DropdownMenu icon={<BsThreeDots className="text-slate-500 group-hover:text-primary" />}>
            <button
              className="flex w-full items-center gap-2 px-4 py-2 text-left font-semibold transition hover:bg-gray-700/30"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/messages/${conv._id}/settings`)
              }}
            >
              <IoSettingsOutline />
              Group settings
            </button>
            {!isOwner && (
              <button
                className="flex w-full items-center gap-2 px-4 py-2 text-left font-semibold text-red-500 transition hover:bg-gray-700/30"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowLeaveModal(true)
                }}
              >
                <FaDoorOpen />
                Leave group
              </button>
            )}
            {isOwner && (
              <button
                className="flex w-full items-center gap-2 px-4 py-2 text-left font-semibold text-red-500 transition hover:bg-gray-700/30"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDeleteModal(true)
                }}
              >
                <FaTrashCan />
                Delete group
              </button>
            )}
          </DropdownMenu>
        )}

        <SlideUpMenu isOpen={isMenuOpen} onClose={handleCloseMenu}>
          {/* className="flex w-full flex-col gap-5" */}
          <div className="flex w-full flex-col gap-5 px-4">
            <div className="flex items-center justify-start gap-2 font-bold">
              <img
                src={getOptimizedImageUrl(
                  conv?.avatar?.imageUrl || "/avatar-placeholder.png",
                  "avatar",
                )}
                className="size-10 rounded-full"
              />
              <span>@{conv?.name}</span>
            </div>
            <div className="flex flex-col gap-3 rounded-xl bg-secondary p-3">
              <button
                className="flex w-full items-center gap-2 text-left font-semibold transition duration-200"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/messages/${conv?._id}/settings`)
                }}
              >
                <TbUser />
                Group settings
              </button>
              <div className="h-[1px] bg-accent"></div>
              {!isOwner && (
                <button
                  className="flex w-full items-center gap-2 text-red-500 text-left font-semibold transition duration-200"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowLeaveModal(true)
                  }}
                >
                  <FaDoorOpen />
                  Leave group
                </button>
              )}
              {isOwner && (
                <button
                  className="flex w-full items-center gap-2 text-left text-red-500 font-semibold transition duration-200"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDeleteModal(true)
                  }}
                >
                  <FaTrashCan />
                  Delete group
                </button>
              )}
            </div>
          </div>
        </SlideUpMenu>
      </div>

      {showLeaveModal && (
        <ConfirmationModal
          isOpen={showLeaveModal}
          modalTitle="Leave Group"
          message={`Are you sure you want to leave "${conv.name}"?`}
          confirmButtonText="Leave"
          onConfirm={() => {
            leaveGroup(conv._id)
            setShowLeaveModal(false)
          }}
          onClose={() => setShowLeaveModal(false)}
          danger
        />
      )}

      {showDeleteModal && (
        <ConfirmationModal
          isOpen={showDeleteModal}
          modalTitle="Delete Group"
          message={`Are you sure you want to permanently delete "${conv.name}"? This cannot be undone.`}
          confirmButtonText="Delete Group"
          onConfirm={() => {
            deleteGroup(conv._id)
            setShowDeleteModal(false)
          }}
          onClose={() => setShowDeleteModal(false)}
          danger
        />
      )}
    </>
  )
}

export default React.memo(GroupConversationItem)
