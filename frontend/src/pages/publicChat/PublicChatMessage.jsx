// src/components/publicChat/PublicChatMessage.jsx

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MdDeleteForever } from "react-icons/md";
import { FaUserSlash, FaUserCheck, FaReply } from "react-icons/fa"; // Import FaReply
import toast from "react-hot-toast";
import { MdEdit } from "react-icons/md"; // Import the edit icon

import {
  useDeleteOwnPublicMessage,
  useDeletePublicMessage,
} from "../../hooks/publicChatHooks/publicChatHooks";
import { FiTrash } from "react-icons/fi";
import { renderClickableText } from "../../utils/textUtils";
import { truncateText } from "../../utils/truncateText";
import { formatDate } from "date-fns";

// --- PublicChatMessage Component ---
const PublicChatMessage = ({
  message,
  authUser,
  openImageModal,
  onBan,
  onUnban,
  isCurrentlyTouchDevice,
  activeMessageModalId,
  handleMouseEnter,
  handleMouseLeave,
  handleMessageTap,
  handleReactionClick,
  onReply,
  onEdit,
  onJumpToMessage,
  setEditingMessage,
  setReplyingToMessage,
  // NEW: Grouping props
  isFirstInGroup,
  isLastInGroup,
  bubbleClasses, // Receive pre-calculated classes
}) => {
  const { deleteOwnMessage, isDeletingOwnMessage } = useDeleteOwnPublicMessage();
  const { deletePublicMessage: adminDeleteMessage, isPending: isAdminDeleting } =
    useDeletePublicMessage();
  const [isHovered, setIsHovered] = useState(false);

  const fromMe = message.sender._id === authUser._id;

  const myBubbleBgColor = "bg-primary"; // These are now likely covered by `bubbleClasses` but good to keep for clarity if needed elsewhere
  const othersBubbleBgColor = "bg-[#2F3336]"; // Same as above

  const textColor = "text-white";
  const linkColor = fromMe ? "text-blue-200" : "text-blue-400";

  const isSenderAdmin = message.sender.isAdmin;
  const isAuthUserAdmin = authUser.isAdmin;
  const isSenderBanned = message.sender.isBannedInPublicChat;
  const isMessageDeleted = message.isDeletedByAdmin || message.isDeletedByUser;
  const isSenderVerified = message.sender.isVerified;
  const isMessageEdited = message.isEdited;

  // `bubbleRounding` is now replaced by `bubbleClasses` passed from parent

  const showModal = activeMessageModalId === message._id;
  const allowedEmojis = ["❤️", "👍", "😂", "😭", "😡"];

  const shouldShowTimeOnHover = isHovered || showModal;

  const messageHighlightClass = isCurrentlyTouchDevice
    ? showModal
      ? "active-highlight"
      : ""
    : "hover:bg-secondary"; // This hover class needs adjustment or removal if you want the whole row to highlight

  // --- Grouping Reactions Logic ---
  const groupedReactions = message.reactions?.reduce((acc, reaction) => {
    const reactorId = reaction.userId?._id?.toString() || reaction.userId?.toString();
    const reactorUsername = reaction?.userId?.username || "Unknown";
    const reactorProfileImg = reaction.userId?.profileImg || "/avatar-placeholder.png";

    if (!reactorId) return acc;

    acc[reaction.emoji] = acc[reaction.emoji] || {
      count: 0,
      users: [],
      userIds: [],
    };

    acc[reaction.emoji].count++;

    if (!acc[reaction.emoji].userIds.includes(reactorId)) {
      acc[reaction.emoji].users.push({
        _id: reactorId,
        username: reactorUsername,
        profileImg: reactorProfileImg,
        fullName: reaction?.userId?.fullName,
      });
      acc[reaction.emoji].userIds.push(reactorId);
    }

    return acc;
  }, {});

  const handleAdminDeleteClick = (e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this message as an admin?")) {
      adminDeleteMessage(message._id);
    }
  };

  const handleAdminBanClick = () => {
    onBan(message.sender._id);
  };

  const handleAdminUnbanClick = () => {
    onUnban(message.sender._id);
  };

  const handleDeleteOwnMessageInModal = (e) => {
    e.stopPropagation();
    if (!isDeletingOwnMessage) {
      deleteOwnMessage(message._id);
    }
  };

  const handleReplyClick = (e) => {
    e.stopPropagation();
    onReply(message);
    setEditingMessage(null);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    onEdit(message);
    setReplyingToMessage(null);
  };

  const handleReplyingToClick = (e) => {
    e.stopPropagation();
    if (message.replyTo && message.replyTo._id) {
      onJumpToMessage(message.replyTo._id);
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // Helper for formatting date (e.g., "July 19, 2025")
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString([], {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div
      key={message._id}
      id={`message-${message._id}`}
      className={`relative mb-0 p-[1px] rounded-lg ${messageHighlightClass} ${
        fromMe ? "justify-end" : "justify-start"
      }`}
      onMouseEnter={() => {
        handleMouseEnter(message._id);
        setIsHovered(true); // Set hover state to true
      }}
      onMouseLeave={() => {
        handleMouseLeave();
        setIsHovered(false); // Set hover state to false
      }}
      onClick={(e) => {
        const modalElement = document.getElementById(
          `message-reaction-modal-${message._id}`
        );
        const adminDropdownElement = e.currentTarget.querySelector(".admin-dropdown");

        if (
          (modalElement && modalElement.contains(e.target)) ||
          (adminDropdownElement && adminDropdownElement.contains(e.target))
        ) {
          return;
        }
        handleMessageTap(message._id);
      }}
    >
      {shouldShowTimeOnHover && fromMe && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 mr-2 z-0 whitespace-nowrap">
          {formatTime(message.createdAt)}
        </div>
      )}
      {/* Reaction Picker and Action Modal (absolute positioned) */}
      <div
        id={`message-reaction-modal-${message._id}`}
        className={`absolute -top-5 bg-secondary shadow-sm shadow-primary rounded-xl px-2 flex items-center gap-1 transition-opacity z-10
                      ${
                        fromMe
                          ? "-left-28 translate-x-1/2" // Adjust position for sender's messages
                          : "-right-20 -translate-x-1/2" // Adjust position for receiver's messages
                      }
                      ${
                        showModal
                          ? "opacity-100 pointer-events-auto"
                          : "opacity-0 pointer-events-none"
                      } `}
      >
        {/* Emojis */}
        {allowedEmojis.map((emoji) => (
          <button
            key={emoji}
            onClick={(e) => {
              e.stopPropagation();
              handleReactionClick(message._id, emoji);
            }}
            className={`text-xl hover:scale-125 py-1 transition duration-100`}
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
        <button
          onClick={handleReplyClick}
          className="p-1 text-blue-400 hover:text-blue-500 hover:scale-125 transition duration-100"
          title="Reply to message"
        >
          <FaReply size={18} />
        </button>

        {/* NEW: Edit button (only for own messages that are not deleted/edited) */}
        {fromMe && !isMessageDeleted && (
          <button
            onClick={handleEditClick}
            className="p-1 text-yellow-400 hover:text-yellow-500 hover:scale-125 transition duration-100"
            title="Edit Message"
          >
            <MdEdit size={20} />
          </button>
        )}

        {/* Trash Icon for deleting own message */}
        {fromMe && (
          <button
            onClick={handleDeleteOwnMessageInModal}
            disabled={isDeletingOwnMessage}
            className="p-1 text-red-400 hover:text-red-500 hover:scale-125 transition duration-100"
            title={isDeletingOwnMessage ? "Deleting..." : "Delete Message"}
          >
            <FiTrash size={18} />
          </button>
        )}
        {/* Admin Delete and Ban/Unban Buttons */}
        {isAuthUserAdmin && !fromMe && (
          <>
            {!isMessageDeleted && (
              <button
                onClick={handleAdminDeleteClick}
                disabled={isAdminDeleting}
                className="p-1 text-red-400 hover:text-red-500 hover:scale-125 transition duration-100"
                title="Delete message (Admin)"
              >
                <MdDeleteForever size={20} />
              </button>
            )}

            {isSenderBanned ? (
              <button
                onClick={handleAdminUnbanClick}
                disabled={false}
                className="p-1 text-green-400 hover:text-green-500 hover:scale-125 transition duration-100"
                title={`Unban ${message.sender.username} (Admin)`}
              >
                <FaUserCheck size={18} />
              </button>
            ) : (
              <button
                onClick={handleAdminBanClick}
                disabled={false}
                className="p-1 text-red-400 hover:text-red-500 hover:scale-125 transition duration-100"
                title={`Ban ${message.sender.username} (Admin)`}
              >
                <FaUserSlash size={18} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Message Content and other elements */}
      <div
        className={`relative flex gap-2 items-start ${
          fromMe ? "ml-28 flex-row-reverse" : "mr-28 flex-row"
        } `}
      >
        {/* Avatar - Only show if it's the first message in a group and not from current user */}
        {!fromMe && isFirstInGroup && (
          <div className="flex-shrink-0">
            <Link to={`/profile/${message.sender.username}`}>
              <img
                alt="User Avatar"
                src={message.sender.profileImg || "/avatar-placeholder.png"}
                className="size-9 rounded-full object-cover mt-9" // mb-5 to push the avatar down for non-first messages
              />
            </Link>
          </div>
        )}

        {/* Spacer for non-first messages to align with avatar */}
        {!fromMe && !isFirstInGroup && <div className="w-9 flex-shrink-0" />}

        {shouldShowTimeOnHover && !fromMe && !isFirstInGroup && (
          <div
            className={`absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 mr-2 z-0 whitespace-nowrap`}
          >
            {formatTime(message.createdAt)}
          </div>
        )}

        {/* Message Content and Timestamp Wrapper */}
        <div
          className={`flex flex-col ${
            fromMe ? "items-end" : "items-start"
          } flex-grow min-w-0`}
        >
          {/* Header (Username, Admin/Banned badges) - Only show if it's the first message in a group and not from current user */}
          {!fromMe && isFirstInGroup && (
            <div>
              <span
                className={`text-xs flex text-gray-500 ${
                  fromMe ? "justify-self-end" : "self-start"
                }`}
              >
                {formatDate(message.createdAt)} at {formatTime(message.createdAt)}
              </span>
              <div className="flex items-center text-sm ">
                <Link
                  to={`/profile/${message.sender.username}`}
                  className={`font-semibold ${linkColor} mr-1`}
                >
                  {message.sender.username}
                </Link>
                {isSenderVerified && <img src="/verified.png" className="size-[17px]" />}

                {isSenderAdmin && (
                  <span className="ml-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900">
                    Admin
                  </span>
                )}
                {isSenderBanned && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white">
                    Banned
                  </span>
                )}
              </div>
            </div>
          )}

          {fromMe && isFirstInGroup && (
            <div className="flex justify-end items-center gap-2 mr-1">
              <span className="text-xs text-gray-500">
                {formatDate(message.createdAt)} at {formatTime(message.createdAt)}
              </span>
            </div>
          )}
          {message.isEdited && message.content && (
            <span className={`text-xs ml-1 italic text-gray-500`}>(Edited)</span>
          )}
          {/* Chat Bubble Container - Now uses the `bubbleClasses` prop */}
          <div
            className={`
                            p-3
                            ${bubbleClasses}
                            flex flex-col
                            w-fit
                            max-w-full
                            overflow-hidden
                        `}
          >
            {message.replyTo && (
              <div
                className={`
                                mb-2 p-2 rounded-md text-xs border
                                ${
                                  fromMe
                                    ? "border-gray-600 bg-blue-300 bg-opacity-30 border-l-4"
                                    : "border-blue-300 bg-gray-950 bg-opacity-30 border-r-4"
                                }
                                flex flex-col cursor-pointer transition-colors duration-200 ease-in-out
                                hover:border-blue-400 hover:bg-opacity-40
                                `}
                onClick={handleReplyingToClick}
              >
                <span
                  className={`font-bold ${fromMe ? "text-gray-600" : "text-gray-300"}`}
                >
                  Replying to:{" "}
                  <span className="font-normal">
                    @{message.replyTo.sender?.username || "Unknown User"}
                  </span>
                </span>
                {message.replyTo.isDeletedByAdmin || message.replyTo.isDeletedByUser ? (
                  <div></div>
                ) : (
                  message.replyTo.content && (
                    <span
                      className={`font-bold truncate ${
                        fromMe ? "text-gray-600" : "text-gray-300"
                      } mt-1 italic`}
                    >
                      {renderClickableText(truncateText(message.replyTo.content))}
                    </span>
                  )
                )}
                {message.replyTo.img && (
                  <img
                    src={message.replyTo.img}
                    alt="replied message attachment"
                    className="mt-1 rounded-md max-w-[100px] max-h-[100px] object-cover"
                  />
                )}
                {message.replyTo.isDeletedByAdmin ||
                  (message.replyTo.isDeletedByUser && (
                    <span className="text-gray-500 italic mt-1">[Message Deleted]</span>
                  ))}
              </div>
            )}
            {message.isDeletedByAdmin || message.isDeletedByUser || isSenderBanned ? (
              <span className="italic text-sm text-gray-400">[Message Deleted]</span>
            ) : (
              <>
                {message.img && (
                  <div className="mb-2 max-w-[200px] h-auto rounded-lg overflow-hidden shadow-md border border-gray-600 cursor-pointer">
                    <img
                      src={message.img}
                      alt="Chat image"
                      className="w-full h-full object-cover"
                      onClick={() => openImageModal(message.img)}
                    />
                  </div>
                )}
                {message.content && (
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {renderClickableText(message.content)}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Grouped Reactions Display */}

          {Object.keys(groupedReactions || {}).length > 0 && (
            <div
              className={`flex gap-1 items-center pt-0.5 rounded-full text-xs font-semibold
                                ${fromMe ? "self-end" : "self-start"}
                                `}
            >
              {Object.entries(groupedReactions).map(([emoji, data]) => {
                const hasCurrentUserReactedToThisEmoji = data.userIds.some(
                  (userId) => userId === authUser._id?.toString()
                );

                const reactionUsersTitle = data.users
                  .map((user) => user.username || user.fullName || "Unknown")
                  .join(", ");

                return (
                  <div
                    key={emoji}
                    className={`flex items-center cursor-pointer text-md rounded-lg px-1.5 py-1.5 transition-colors duration-200
                                                ${
                                                  hasCurrentUserReactedToThisEmoji
                                                    ? "bg-violet-600/30 border-violet-600 border"
                                                    : "bg-gray-800 border border-gray-800"
                                                }`}
                    title={reactionUsersTitle ? `Reacted by: ${reactionUsersTitle}` : ""}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReactionClick(message._id, emoji);
                    }}
                  >
                    <span className="text-[16px]">{emoji}</span>
                    <span className="ml-1 font-bold">{data.count}</span>
                  </div>
                );
              })}
            </div>
          )}
          {/* Timestamp below the bubble - Only show if it's the last message in a group */}
          {/* {isLastInGroup && (

          )} */}
        </div>
      </div>
    </div>
  );
};

export default PublicChatMessage;
