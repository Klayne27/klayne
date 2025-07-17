// src/components/publicChat/PublicChatMessage.jsx

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MdDeleteForever } from "react-icons/md"; // Import MdDeleteForever for the trash icon
import { FaUserSlash, FaUserCheck } from "react-icons/fa";
import toast from "react-hot-toast";
// Assuming useDeleteOwnPublicMessage is imported correctly from your publicChatHooks file
import { useDeleteOwnPublicMessage, useDeletePublicMessage } from "../../hooks/publicChatHooks/publicChatHooks";
import { FiTrash } from "react-icons/fi";

const PublicChatMessage = ({
  message,
  authUser,
  openImageModal,
  // onDelete, // This seems to be for admin delete, keep it for now
  onBan,
  onUnban,
  isCurrentlyTouchDevice,
  activeMessageModalId,
  handleMouseEnter,
  handleMouseLeave,
  handleMessageTap,
  handleReactionClick, // Function to call useAddPublicMessageReaction
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { deleteOwnMessage, isDeletingOwnMessage } = useDeleteOwnPublicMessage(); // Destructure new hook
  const { deletePublicMessage: adminDeleteMessage, isPending: isAdminDeleting } = useDeletePublicMessage();

  // Determine if the message belongs to the currently authenticated user
  const fromMe = message.sender._id === authUser._id;

  const myBubbleBgColor = "bg-primary";
  const othersBubbleBgColor = "bg-gray-700";

  const textColor = "text-white";
  const linkColor = fromMe ? "text-blue-200" : "text-blue-400";

  const isSenderAdmin = message.sender.isAdmin;
  const isAuthUserAdmin = authUser.isAdmin; // Check if the auth user is an admin
  const isSenderBanned = message.sender.isBannedInPublicChat;
  const isMessageDeleted = message.isDeletedByAdmin;

  const bubbleRounding = fromMe
    ? "rounded-3xl rounded-br-[4px]"
    : "rounded-3xl rounded-bl-[4px]";

  const showModal = activeMessageModalId === message._id;
  const allowedEmojis = ["❤️", "👍", "😂", "😭", "😡"];

  const messageHighlightClass = isCurrentlyTouchDevice
    ? showModal
      ? "active-highlight"
      : ""
    : "hover:bg-secondary";

  // --- Grouping Reactions Logic ---
  const groupedReactions = message.reactions?.reduce((acc, reaction) => {
    const reactorId = reaction.userId?._id?.toString() || reaction.userId?.toString();
    const reactorUsername = reaction.userId?.username || "Unknown";
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
      });
      acc[reaction.emoji].userIds.push(reactorId);
    }

    return acc;
  }, {});

  // Admin Delete Handler (existing, passed via props)
   const handleAdminDeleteClick = (e) => {
     e.stopPropagation();
     if (window.confirm("Are you sure you want to delete this message as an admin?")) {
       adminDeleteMessage(message._id); // This prop should call useDeletePublicMessage
       // If you moved useDeletePublicMessage hook here, use: adminDeleteMessage(message._id);
     }
   };

  const handleAdminBanClick = () => {
    if (
      window.confirm(
        `Are you sure you want to ban ${message.sender.username} from the public chat?`
      )
    ) {
      onBan(message.sender._id);
      setIsDropdownOpen(false);
    }
  };

  const handleAdminUnbanClick = () => {
    if (
      window.confirm(
        `Are you sure you want to unban ${message.sender.username} from the public chat?`
      )
    ) {
      onUnban(message.sender._id);
      setIsDropdownOpen(false);
    }
  };

  // Handler for deleting THIS user's own message
  const handleDeleteOwnMessageInModal = (e) => {
    e.stopPropagation(); // Prevent the main message click handler

    if (!isDeletingOwnMessage) {
      deleteOwnMessage(message._id);
      // After deletion, you might want to close the modal
      // This would usually be handled by a parent component managing activeMessageModalId
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  return (
    <div
      key={message._id}
      id={`message-${message._id}`}
      className={`relative mb-4 p-1 rounded-lg ${messageHighlightClass} ${
        fromMe ? "justify-end" : "justify-start"
      }`}
      onMouseEnter={() => handleMouseEnter(message._id)}
      onMouseLeave={handleMouseLeave}
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
      {/* Reaction Picker Modal (absolute positioned) */}
      <div
        id={`message-reaction-modal-${message._id}`}
        className={`absolute -top-5 bg-secondary shadow-sm shadow-primary rounded-xl px-2 flex items-center gap-1 transition-opacity z-10
                        ${
                          fromMe
                            ? "-left-20 translate-x-1/2" // Adjust position for sender's messages
                            : "-right-16 -translate-x-1/2" // Adjust position for receiver's messages
                        }
                        ${
                          showModal
                            ? "opacity-100 pointer-events-auto"
                            : "opacity-0 pointer-events-none"
                        } `}
      >
        {allowedEmojis.map((emoji) => (
          <button
            key={emoji}
            onClick={(e) => {
              e.stopPropagation(); // Prevent message tap from being triggered
              handleReactionClick(message._id, emoji);
            }}
            className={`text-xl hover:scale-125 py-1 transition duration-100`}
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
        {/* Trash Icon for deleting own message */}
        {fromMe && ( // Only show if it's the current user's message
          <button
            onClick={handleDeleteOwnMessageInModal}
            disabled={isDeletingOwnMessage}
            className="p-1 text-red-400 hover:text-red-500 hover:scale-125 transition duration-100"
            title={isDeletingOwnMessage ? "Deleting..." : "Delete Message"}
          >
            <FiTrash size={18} />
          </button>
        )}{" "}
        {isAuthUserAdmin &&
          !fromMe && ( // Only show for admins, on *other* users' messages
            <>
              {/* Admin Delete Message Button */}
              {!isMessageDeleted && ( // Don't show if already deleted by admin
                <button
                  onClick={handleAdminDeleteClick}
                  // The disable state here should ideally be for the admin delete operation,
                  // not necessarily tied to `isDeletingOwnMessage`. You might need a separate
                  // `isDeletingOtherMessage` state or a more generic `isActionPending` prop.
                  disabled={false} // Adjust this if you implement a separate loading state
                  className="p-1 text-red-400 hover:text-red-500 hover:scale-125 transition duration-100"
                  title="Delete message (Admin)"
                >
                  <MdDeleteForever size={20} /> {/* Larger trash icon for admin */}
                </button>
              )}

              {/* Admin Ban/Unban Button */}
              {isSenderBanned ? (
                <button
                  onClick={handleAdminUnbanClick}
                  // Again, adjust disabled state if you have a specific loading state for ban/unban
                  disabled={false}
                  className="p-1 text-green-400 hover:text-green-500 hover:scale-125 transition duration-100"
                  title={`Unban ${message.sender.username} (Admin)`}
                >
                  <FaUserCheck size={18} />
                </button>
              ) : (
                <button
                  onClick={handleAdminBanClick}
                  // Adjust disabled state
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
        className={`relative flex gap-2 items-end ${
          fromMe ? "ml-28 flex-row-reverse" : "mr-28 flex-row"
        } `}
      >
        {/* Avatar */}
        {!fromMe && (
          <div className="flex-shrink-0">
            <Link to={`/profile/${message.sender.username}`}>
              <img
                alt="User Avatar"
                src={message.sender.profileImg || "/avatar-placeholder.png"}
                className="w-10 h-10 rounded-full object-cover mb-5"
              />
            </Link>
          </div>
        )}

        {/* Message Content and Timestamp Wrapper */}
        <div
          className={`flex flex-col ${
            fromMe ? "items-end" : "items-start"
          } flex-grow min-w-0`}
        >
          {/* Header (Username, Admin/Banned badges) */}
          {!fromMe && (
            <div className="flex items-center text-sm mb-1">
              <Link
                to={`/profile/${message.sender.username}`}
                className={`font-semibold ${linkColor} mr-2`}
              >
                {message.sender.username}
                {isSenderAdmin && (
                  <span className="ml-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900">
                    Admin
                  </span>
                )}
              </Link>
              {isSenderBanned && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white">
                  Banned
                </span>
              )}
            </div>
          )}

          {/* Chat Bubble Container */}
          <div
            className={`
                            p-3
                            ${fromMe ? myBubbleBgColor : othersBubbleBgColor}
                            ${textColor}
                            ${bubbleRounding}
                            flex flex-col
                            w-fit
                            max-w-full
                            overflow-hidden
                        `}
          >
            {message.isDeletedByAdmin || isSenderBanned ? (
              <span className="italic text-gray-400">[Message Deleted]</span>
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
                    {message.content}
                  </p>
                )}
              </>
            )}

            {/* Admin Actions Dropdown (Only for admins, on other users' messages) */}
            {/* {isAuthUserAdmin && !fromMe && (
              <div className="absolute right-1 admin-dropdown">
                {" "}
                <button
                  onClick={toggleDropdown}
                  onBlur={(e) => {
                    requestAnimationFrame(() => {
                      if (!e.currentTarget.contains(document.activeElement)) {
                        closeDropdown();
                      }
                    });
                  }}
                  className="p-1 rounded-full text-gray-400 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-700 focus:ring-white"
                >
                  <span className="sr-only">Open options</span>
                  ...
                </button>
                {isDropdownOpen && (
                  <ul className="absolute left-1 mt-1 w-40 z-[1000] bg-gray-800 rounded-md shadow-lg py-1">
                    {!isMessageDeleted && (
                      <li>
                        <button
                          onClick={handleDeleteClick}
                          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                        >
                          <MdDeleteForever className="w-4 h-4" /> Delete Message
                        </button>
                      </li>
                    )}
                    <li>
                      {isSenderBanned ? (
                        <button
                          onClick={handleUnbanClick}
                          className="w-full text-left px-4 py-2 text-sm text-green-400 hover:bg-gray-700 flex items-center gap-2"
                        >
                          <FaUserCheck className="w-4 h-4" /> Unban User
                        </button>
                      ) : (
                        <button
                          onClick={handleBanClick}
                          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                        >
                          <FaUserSlash className="w-4 h-4" /> Ban User
                        </button>
                      )}
                    </li>
                  </ul>
                )}
              </div>
            )} */}
          </div>

          {/* Grouped Reactions Display */}
          {Object.keys(groupedReactions || {}).length > 0 && (
            <div
              className={`flex gap-1 items-center py-1 rounded-full text-xs font-semibold
                                ${fromMe ? "self-end" : "self-start"}
                                `}
            >
              {Object.entries(groupedReactions).map(([emoji, data]) => {
                const hasCurrentUserReactedToThisEmoji = data.userIds.some(
                  (userId) => userId === authUser._id?.toString()
                );

                // Create a title string with all usernames who reacted with this emoji
                const reactionUsersTitle = data.users
                  .map((user) => user.username) // Use data.users which has username
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

          {/* Timestamp below the bubble */}
          <span
            className={`text-xs mt-1 flex text-gray-500 ${
              fromMe ? "justify-self-end" : "self-start"
            }`}
          >
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PublicChatMessage;
