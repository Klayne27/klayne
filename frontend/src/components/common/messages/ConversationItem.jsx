// src/components/common/messages/ConversationItem.jsx

import { Link } from "react-router-dom";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import { formatPostDate } from "../../../utils/date";
import { MdImage } from "react-icons/md";
import React, { useEffect, useRef, useState } from "react";
import { useToggleConversationVisibility } from "../../../hooks/messagesHooks/useToggleConversationVisibility";
import { CiCircleMinus } from "react-icons/ci";
import useDeleteConversation from "../../../hooks/messagesHooks/useDeleteConversation";
import { FiTrash } from "react-icons/fi";
import { BsThreeDots } from "react-icons/bs";
import ConfirmationModal from "../ConfirmationModal";

function ConversationItem({
  conv,
  selectedConversation,
  onSelectConversation,
  onToggleVisibility,
}) {
  const { authUser: currentUser } = useAuthUser();

  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const menuRef = useRef(null);

  const otherUser = conv.participants.find(
    (p) => p?._id.toString() !== currentUser._id.toString()
  );

  const { toggleVisibility, isTogglingVisibility } = useToggleConversationVisibility();
  const { deleteConversation, isPending } = useDeleteConversation();

  const isSelected = selectedConversation?._id === conv._id;

  const isLastMessageUnread =
    conv.lastMessage?.sender?.toString() === otherUser?._id.toString() &&
    !conv.lastMessage?.seen;

  let lastMessageContent = "No messages yet...";
  if (conv.lastMessage?.img) {
    lastMessageContent = (
      <span className="gap-1">
        <MdImage className="inline-block text-lg" /> Image
      </span>
    );
  } else if (conv.lastMessage?.text) {
    lastMessageContent = conv.lastMessage.text;
  }

  const truncatedLastMessage =
    typeof lastMessageContent === "string" && lastMessageContent.length > 35
      ? lastMessageContent.slice(0, 35) + "..."
      : lastMessageContent;

  const handleToggleHide = (e) => {
    e.stopPropagation();
    toggleVisibility({ conversationId: conv._id, isHiding: true });
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  const toggleMenu = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleCloseModal = (e) => {
    // e.stopPropagation();
    setShowDeleteModal(false);
  };

  const handleDelete = () => {
    deleteConversation(conv._id);
    setShowDeleteModal(false);
  };

  if (!otherUser) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-1 p-3 cursor-pointer hover:bg-secondary/60 duration-300 transition-colors
        ${isSelected ? "bg-secondary border-r-2 border-r-primary" : ""}
      `}
      onClick={() => onSelectConversation(conv)} // ✨ Simplified handler
    >
      <Link
        to={`/profile/${otherUser.username}`}
        onClick={(e) => e.stopPropagation()}
        className="relative p-1"
      >
        <img
          src={otherUser.profileImg || "/avatar-placeholder.png"}
          alt={otherUser.username}
          className="w-8 h-8 rounded-full object-cover"
        />
      </Link>
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 items-center truncate">
            <span className="font-bold">{otherUser.fullName}</span>
            {otherUser.isVerified && (
              <img src="/verified.png" className="size-[17px]" alt="Verified" />
            )}
            {otherUser.isGoldVerified && (
              <img src="/gold-verified.png" className="size-[17px]" alt="Gold Verified" />
            )}
            <span className="text-gray-400">@{otherUser.username}</span>
            <span className="text-gray-400 text-xs mx-1">·</span>
            <span className="text-gray-400 text-xs shrink-0">
              {formatPostDate(conv.updatedAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-start">
          <p
            className={`text-sm truncate ${
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
      <span
        className="flex ml-auto relative right-0 group rounded-full p-2 mr-0.5 hover:bg-primary/20 transition duration-200"
        onClick={toggleMenu}
      >
        <div className="group duration-200 transition hover:text-primary rounded-full">
          <BsThreeDots className="group-hover:text-primary cursor-pointer text-slate-500" />
        </div>
        {showMenu && (
          <>
            <div
              className="fixed inset-0 bg-transparent z-10 cursor-default"
              onClick={toggleMenu}
            ></div>
            <div
              ref={menuRef}
              className="absolute right-0 top-0 w-max bg-base-100 white-shadow rounded-xl text-md z-10 menu-popover py-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="w-full text-left px-4 py-2 text-white  flex items-center gap-2 font-semibold duration-200 transition hover:bg-gray-700/30"
                onClick={handleToggleHide}
              >
                <CiCircleMinus />
                Hide Conversation
              </button>
              <button
                className="w-full text-left px-4 py-2 text-red-500  flex items-center gap-2 font-semibold duration-200 transition hover:bg-gray-700/30"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(true);
                  setShowMenu(false)
                }}
              >
                <FiTrash />
                Delete Conversation
              </button>
            </div>
          </>
        )}
      </span>

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
  );
}

export default React.memo(ConversationItem);
