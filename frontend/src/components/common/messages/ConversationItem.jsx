import { Link, useNavigate } from "react-router-dom"
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser"
import { formatPostDate } from "../../../utils/date"
import { MdImage } from "react-icons/md"
import React, { useState } from "react"
import { useToggleConversationVisibility } from "../../../hooks/messagesHooks/useToggleConversationVisibility"
import { CiCircleMinus } from "react-icons/ci"
import useDeleteConversation from "../../../hooks/messagesHooks/useDeleteConversation"
import { FiTrash } from "react-icons/fi"
import ConfirmationModal from "../../ui/ConfirmationModal"
import { usePrivateChatStore } from "../../../store/usePrivateChatStore"
import DropdownMenu from "../../ui/DropdownMenu"

function ConversationItem({ conv }) {
  const { authUser: currentUser } = useAuthUser()
  const navigate = useNavigate()

  const selectedConversation = usePrivateChatStore((state) => state.selectedConversation)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const otherUser = conv.participants.find((p) => p?._id.toString() !== currentUser._id.toString())

  const { toggleVisibility } = useToggleConversationVisibility()
  const { deleteConversation } = useDeleteConversation()

  const isSelected = selectedConversation?._id === conv._id

  const isLastMessageUnread =
    conv.lastMessage?.sender?.toString() === otherUser?._id.toString() && !conv.lastMessage?.seen

  let lastMessageContent = "No messages yet..."
  if (conv.lastMessage?.img) {
    lastMessageContent = (
      <span className="gap-1">
        <MdImage className="inline-block text-lg" /> Image
      </span>
    )
  } else if (conv.lastMessage?.text) {
    lastMessageContent = conv.lastMessage.text
  }

  const truncatedLastMessage =
    typeof lastMessageContent === "string" && lastMessageContent.length > 35
      ? lastMessageContent.slice(0, 35) + "..."
      : lastMessageContent

  const handleToggleHide = (e) => {
    e.stopPropagation()
    toggleVisibility({ conversationId: conv._id, isHiding: true })
  }

  const handleCloseModal = (e) => {
    // e.stopPropagation();
    setShowDeleteModal(false)
  }

  const handleDelete = () => {
    deleteConversation(conv._id)
    setShowDeleteModal(false)
  }

  const handleSelectConversation = () => {
    navigate(`/messages/${conv._id}`)
  }

  if (!otherUser) {
    return null
  }

  return (
    <div
      className={`flex cursor-pointer items-center gap-1 p-3 transition-colors duration-300 hover:bg-secondary/60 ${isSelected ? "border-r-2 border-r-primary bg-secondary" : ""} `}
      onClick={handleSelectConversation}
    >
      <Link
        to={`/profile/${otherUser.username}`}
        onClick={(e) => e.stopPropagation()}
        className="relative p-1"
      >
        <img
          src={otherUser.profileImg?.imageUrl || "/avatar-placeholder.png"}
          alt={otherUser.username}
          className="h-8 w-8 rounded-full object-cover"
        />
      </Link>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 truncate">
            <span className="font-bold">{otherUser.fullName}</span>
            {otherUser.isVerified && (
              <img src="/verified.png" className="size-[17px]" alt="Verified" />
            )}
            {otherUser.isGoldVerified && (
              <img src="/gold-verified.png" className="size-[17px]" alt="Gold Verified" />
            )}
            <span className="text-gray-400">@{otherUser.username}</span>
            <span className="mx-1 text-xs text-gray-400">·</span>
            <span className="shrink-0 text-xs text-gray-400">{formatPostDate(conv.updatedAt)}</span>
          </div>
        </div>
        <div className="flex items-center justify-start">
          <p
            className={`truncate text-sm ${
              isLastMessageUnread ? "font-semibold" : "text-gray-400"
            }`}
          >
            {isLastMessageUnread && <span className="mr-1 text-blue-500">●</span>}

            {lastMessageContent === "No messages yet..." ? (
              <span className="italic">{lastMessageContent}</span>
            ) : (
              truncatedLastMessage
            )}
          </p>
        </div>
      </div>
      <DropdownMenu>
        <button
          className="flex w-full items-center gap-2 px-4 py-2 text-left font-semibold text-white transition duration-200 hover:bg-gray-700/30"
          onClick={handleToggleHide}
        >
          <CiCircleMinus />
          Hide Conversation
        </button>
        <button
          className="flex w-full items-center gap-2 px-4 py-2 text-left font-semibold text-red-500 transition duration-200 hover:bg-gray-700/30"
          onClick={(e) => {
            e.stopPropagation()
            setShowDeleteModal(true)
          }}
        >
          <FiTrash />
          Delete Conversation
        </button>
      </DropdownMenu>

      {showDeleteModal && (
        <ConfirmationModal
          isOpen={showDeleteModal}
          modalTitle="Confirm Conversation Deletion"
          message={`Are you sure you want to delete this conversation? This action will permanently remove all messages for both participants and unfollow ${otherUser.username}. You will also be unfollowed by them.`}
          confirmButtonText="Yes, Delete Conversation"
          onConfirm={handleDelete}
          onClose={handleCloseModal}
          danger={true}
        />
      )}
    </div>
  )
}

export default React.memo(ConversationItem)
