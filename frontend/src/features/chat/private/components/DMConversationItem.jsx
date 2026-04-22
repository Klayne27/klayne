import { useNavigate } from "react-router-dom"
import { MdBlock, MdImage } from "react-icons/md"
import React, { useState } from "react"
import { FaTrashCan } from "react-icons/fa6"
import { FaBroom } from "react-icons/fa6"
import { TbUser, TbUserMinus } from "react-icons/tb"
import { BsThreeDots } from "react-icons/bs"
import { PiMicrophoneStageFill } from "react-icons/pi"
import { useAuthUser } from "../../../auth/authHooks/useAuthUser"
import { useSocket } from "../../../../context/SocketContext"
import useDropdownMenu from "../../../../hooks/customHooks/useDropdownMenu"
import { usePrivateChatStore } from "../../../../store/usePrivateChatStore"
import { getOptimizedImageUrl } from "../../../../utils/cloudinaryUtils"
import { formatPostDate } from "../../../../utils/date"
import DropdownMenu from "../../../../components/common/DropdownMenu"
import SlideUpMenu from "../../../../components/common/SlideUpMenu"
import ConfirmationModal from "../../../../components/common/ConfirmationModal"

import useMobileConversationLongPress from "../../../../hooks/customHooks/useMobileConversationLongPress"
import {
  useDeleteAllMessagesOnMySide,
  useDeleteConversation,
  useToggleConversationVisibility,
} from "../privateChatHooks/usePrivateChatMutations"
import { useBlockUnblockUser } from "../../../users/usersHooks/useUserMutations"
import UserAvatar from "../../../../components/common/UserAvatar"
import { getNameplateClass } from "../../../../utils/getNameplateClass"
import { WARDROBE_CONFIG } from "../../../wardrobe/wardrobeConfig"
import UserFullName from "../../../../components/common/UserFullname"

function DMConversationItem({ conv }) {
  const { authUser: currentUser } = useAuthUser()
  const navigate = useNavigate()
  const { onlineUsers } = useSocket()
  const { setShowMenu } = useDropdownMenu()

  const selectedConversation = usePrivateChatStore((state) => state.selectedConversation)
  const setReplyingToMessage = usePrivateChatStore((state) => state.setReplyingToMessage)
  const setAudioBlob = usePrivateChatStore((state) => state.setAudioBlob)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showOneSidedDeleteModal, setShowOneSidedDeleteModal] = useState(false)
  const [showBlockConfirmationModal, setShowBlockConfirmationModal] = useState(false)



  const otherUser = conv?.participants?.find((p) => {
    if (!p) return false
    const participantId = p?._id ? p._id.toString() : p.toString()
    return participantId !== currentUser._id.toString()
  })

  const { toggleVisibility } = useToggleConversationVisibility()
  const { deleteConversation } = useDeleteConversation()
  const { deleteAllMessages } = useDeleteAllMessagesOnMySide() // Use the new hook
  const { blockUnblockUser, isBlocking } = useBlockUnblockUser()

  const isOnline = onlineUsers.includes(otherUser?._id)

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

      const equippedFont = otherUser?.equipped?.font
      // const equippedTheme = otherUser?.equipped?.theme

      // 2. Map them to your config values
      const fontVars = WARDROBE_CONFIG[equippedFont]?.cssVars || {}
      // const themeVars = WARDROBE_CONFIG[equippedTheme]?.cssVars || {}

  const isMenuOpen = activeConversationId === conv._id
  const isSelected = selectedConversation?._id === conv._id

  const isLastMessageByOtherUser = conv?.lastMessage?.sender?._id === otherUser?._id

  const isLastMessageUnread =
    conv.lastMessage?.sender?._id.toString() === otherUser?._id.toString() &&
    !conv.lastMessage?.seen

  let lastMessageContent = "No messages yet..."

  if (conv.lastMessage?.img) {
    lastMessageContent = (
      <span className="gap-1">
        <MdImage className="inline-block text-lg" /> Image
      </span>
    )
  } else if (conv.lastMessage?.audio) {
    lastMessageContent = (
      <span className="gap-1">
        <PiMicrophoneStageFill className="inline-block text-sm" /> Voice Message
      </span>
    )
  } else if (conv.lastMessage?.text) {
    lastMessageContent = conv.lastMessage.text
  }

  const userSelectStyle = isMobile
    ? {
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        touchAction: "manipulation",
      }
    : {}

  const truncatedLastMessage =
    typeof lastMessageContent === "string" && lastMessageContent.length > 35
      ? lastMessageContent.slice(0, 35) + "..."
      : lastMessageContent

  const handleToggleHide = (e) => {
    e.stopPropagation()
    toggleVisibility({ conversationId: conv._id, isHiding: true })
  }

  const handleCloseDeleteConversationModal = () => {
    setShowDeleteModal(false)
  }

  const handleCloseOneSidedDeleteModal = () => {
    setShowOneSidedDeleteModal(false)
  }

  const handleDelete = () => {
    deleteConversation(conv._id)
    setShowDeleteModal(false)
  }

  const handleDeleteOnMySide = () => {
    deleteAllMessages(conv._id)
    setShowOneSidedDeleteModal(false)
  }

  const handleSelectConversation = () => {
    navigate(`/messages/${conv._id}`)
    setReplyingToMessage(null)
    setAudioBlob(null)
  }

  // Prevent navigation if a long press is active
  const handleTouchStartWithId = (e) => {
    e.convId = conv._id // Pass the conversation ID to the long press hook
    handleTouchStart(e)
  }

  const handleConfirmblock = (e) => {
    e.stopPropagation()
    if (!currentUser || isBlocking) return
    blockUnblockUser(otherUser?._id)
  }

  const closeBlockConfirmationModal = () => {
    setShowBlockConfirmationModal(false)
  }

  const openBlockConfirmationModal = (e) => {
    e.stopPropagation()
    if (!otherUser?._id) return
    setShowBlockConfirmationModal(true)
    setShowMenu(false)
  }

  const nameplateClass = getNameplateClass(otherUser?.equipped?.nameplate)

  if (!otherUser || !otherUser.username) {
    return null
  }
  return (
    <div
      className={`flex cursor-pointer items-center gap-1 p-3 transition-colors duration-300 hover:bg-secondary/60 ${nameplateClass} ${isSelected ? "border-r-2 border-r-primary bg-secondary" : ""} `}
      onClick={handleSelectConversation}
      onTouchStart={handleTouchStartWithId}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onTouchCancel={handleTouchCancel}
    >
      <div className="relative p-1">
        <UserAvatar user={otherUser} size={"sm"} />
        {isOnline ? (
          <span className="absolute bottom-2 right-1 h-3 w-3 rounded-full border-2 border-base-100 bg-green-500"></span>
        ) : (
          <span className="absolute bottom-2 right-0.5 h-3 w-3 rounded-full border-2 border-base-100 bg-gray-500"></span>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden" style={userSelectStyle}>
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center" style={userSelectStyle}>
            {/* <span
              className={`mr-1 flex-shrink-0 truncate font-bold`}
              style={otherUser.nameColor ? { color: otherUser.nameColor } : undefined}
              style={{
                ...(otherUser.nameColor ? { color: otherUser.nameColor } : {}),
                ...fontVars,
                fontFamily: "var(--user-font, inherit)",
              }}
            >
              {otherUser.fullName}
            </span> */}
            <UserFullName
              user={otherUser}
              className={`mr-1 flex-shrink-0 truncate font-bold`}
              style={otherUser.nameColor ? { color: otherUser.nameColor } : undefined}
            />
            {otherUser.isVerified && (
              <img src="/verified2.png" className="size-[17px]" alt="Verified" />
            )}
            {otherUser.isGoldVerified && (
              <img src="/gold-verified2.png" className="size-[17px]" alt="Gold Verified" />
            )}
            {otherUser.isCha && <img src="/cha.png" className="size-[15px] rounded-md" />}
            <span className="flex-shrink-1 min-w-0 truncate text-sm text-gray-400">
              @{otherUser.username}
            </span>
            <span className="mx-1 text-xs text-gray-400">·</span>
            <span className="shrink-0 text-xs text-gray-400">{formatPostDate(conv.updatedAt)}</span>
          </div>
        </div>
        <div className="flex items-center justify-start" style={userSelectStyle}>
          <p
            className={`truncate text-sm ${
              isLastMessageUnread ? "font-semibold" : "text-gray-400"
            }`}
          >
            {isLastMessageUnread && <span className="mr-1 text-blue-500">●</span>}

            {lastMessageContent === "No messages yet..." ? (
              <span className="pl-[2px] italic">{lastMessageContent}</span>
            ) : (
              <span className="pl-[2px]">
                {isLastMessageByOtherUser ? otherUser?.username : "You"}: {truncatedLastMessage}
              </span>
            )}
          </p>
        </div>
      </div>
      {!isMobile && (
        <DropdownMenu icon={<BsThreeDots className="text-slate-500 group-hover:text-primary" />}>
          <button
            className="template flex w-full items-center gap-2 px-4 py-2 text-left font-semibold transition duration-200 hover:bg-gray-700/30"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/profile/${otherUser?.username}`)
            }}
          >
            <TbUser />
            View profile
          </button>
          <button
            className="flex w-full items-center gap-2 px-4 py-2 text-left font-semibold transition duration-200 hover:bg-gray-700/30"
            onClick={handleToggleHide}
          >
            <TbUserMinus />
            Hide conversation
          </button>
          <button
            className="flex w-full items-center gap-2 px-4 py-2 text-left font-semibold transition duration-200 hover:bg-gray-700/30"
            onClick={openBlockConfirmationModal}
          >
            <MdBlock />
            Block
          </button>
          <button
            className="flex w-full items-center gap-2 px-4 py-2 text-left font-semibold text-red-500 transition duration-200 hover:bg-gray-700/30"
            onClick={(e) => {
              handleCloseMenu()
              e.stopPropagation()
              setShowOneSidedDeleteModal(true)
              setShowMenu(false)
            }}
          >
            <FaBroom />
            Delete all messages
          </button>
          <button
            className="flex w-full items-center gap-2 px-4 py-2 text-left font-semibold text-red-500 transition duration-200 hover:bg-gray-700/30"
            onClick={(e) => {
              e.stopPropagation()
              setShowDeleteModal(true)
              setShowMenu(false)
            }}
          >
            <FaTrashCan />
            Delete conversation
          </button>
        </DropdownMenu>
      )}

      <SlideUpMenu isOpen={isMenuOpen} onClose={handleCloseMenu}>
        {/* className="flex w-full flex-col gap-5" */}
        <div className="flex w-full flex-col gap-5 px-4">
          <div className="flex items-center justify-start gap-2 font-bold">
            <img
              src={getOptimizedImageUrl(
                otherUser?.profileImg?.imageUrl || "/avatar-placeholder.png",
                "avatar",
              )}
              className="size-10 rounded-full"
            />
            <span>@{otherUser?.username}</span>
          </div>
          <div className="flex flex-col gap-3 rounded-xl bg-secondary p-3">
            <button
              className="flex w-full items-center gap-2 text-left font-semibold transition duration-200"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/profile/${otherUser?.username}`)
              }}
            >
              <TbUser />
              View profile
            </button>
            <div className="h-[1px] bg-accent"></div>
            <button
              className="flex w-full items-center gap-2 text-left font-semibold transition duration-200"
              onClick={handleToggleHide}
            >
              <TbUserMinus />
              Hide conversation
            </button>
          </div>
          <div className="mb-2 flex flex-col gap-3 rounded-xl bg-secondary p-3">
            <button
              className="flex w-full items-center gap-2 text-left font-semibold transition duration-200"
              onClick={openBlockConfirmationModal}
            >
              <MdBlock />
              Block
            </button>
          </div>
          <div className="mb-2 flex flex-col gap-3 rounded-xl bg-secondary p-3">
            <button
              className="flex w-full items-center gap-2 text-left font-semibold text-red-500 transition duration-200"
              onClick={(e) => {
                e.stopPropagation()
                setShowOneSidedDeleteModal(true)
                setShowMenu(false)
              }}
            >
              <FaBroom />
              Delete all messages
            </button>
            <div className="h-[1px] bg-accent"></div>
            <button
              className="flex w-full items-center gap-2 text-left font-semibold text-red-500 transition duration-200"
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteModal(true)
                setShowMenu(false)
              }}
            >
              <FaTrashCan />
              Delete conversation
            </button>
          </div>
        </div>
      </SlideUpMenu>

      {/* Confirmation Modal for two-sided deletion */}
      {showDeleteModal && (
        <ConfirmationModal
          isOpen={showDeleteModal}
          modalTitle="Confirm Conversation Deletion"
          message={`Are you sure you want to delete this conversation? This action will permanently remove all messages for both participants.`}
          confirmButtonText="Yes, Delete Conversation"
          onConfirm={handleDelete}
          onClose={handleCloseDeleteConversationModal}
          danger={true}
        />
      )}

      {/* New Confirmation Modal for one-sided deletion */}
      {showOneSidedDeleteModal && (
        <ConfirmationModal
          isOpen={showOneSidedDeleteModal}
          modalTitle="Confirm One-Sided Deletion"
          message={`Are you sure you want to delete all messages in this conversation for yourself? This action is permanent and will not affect ${otherUser.username}.`}
          confirmButtonText="Yes, Delete Messages"
          onConfirm={handleDeleteOnMySide}
          onClose={handleCloseOneSidedDeleteModal}
          danger={true}
        />
      )}

      <ConfirmationModal
        isOpen={showBlockConfirmationModal}
        onClose={closeBlockConfirmationModal}
        onConfirm={handleConfirmblock}
        danger={true}
        message={`They will not be able to see your public posts and will no longer be able to engage with them. @${otherUser?.username} will also not be able to follow or message you, and you will not see notifications from them.`}
        confirmButtonText={"Block"}
        modalTitle={`Block @${otherUser?.username}?`}
      />
    </div>
  )
}

export default React.memo(DMConversationItem)
