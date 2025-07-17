// src/components/publicChat/PublicChatMessage.jsx

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MdDeleteForever } from "react-icons/md";
import { FaUserSlash, FaUserCheck } from "react-icons/fa";
import toast from "react-hot-toast";

// Import new icons for reaction modal, if needed (though emojis themselves are characters)
// No new icons like reply/edit needed here, as per "ignore reply, edit, delete logic for now"

const PublicChatMessage = ({
  message,
  authUser,
  openImageModal,
  onDelete,
  onBan,
  onUnban,
  // --- New Props for Hover/Reactions ---
  isCurrentlyTouchDevice,
  activeMessageModalId,
  handleMouseEnter,
  handleMouseLeave,
  handleMessageTap, // For mobile/touch activation of modal
  handleReactionClick, // Function to call useAddPublicMessageReaction
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const fromMe = message.sender._id === authUser._id;

  const myBubbleBgColor = "bg-primary";
  const othersBubbleBgColor = "bg-gray-700";

  const textColor = "text-white";
  const linkColor = fromMe ? "text-blue-200" : "text-blue-400";

  const isSenderAdmin = message.sender.isAdmin;
  const isAuthUserAdmin = authUser.isAdmin;
  const isSenderBanned = message.sender.isBannedInPublicChat;
  const isMessageDeleted = message.isDeletedByAdmin;

  const bubbleRounding = fromMe
    ? "rounded-3xl rounded-br-[4px]"
    : "rounded-3xl rounded-bl-[4px]";

  const showModal = activeMessageModalId === message._id;
  const allowedEmojis = ["❤️", "👍", "😂", "😭", "😡"];

  // Apply hover effect class based on device type and modal state
  const messageHighlightClass = isCurrentlyTouchDevice
    ? showModal
      ? "active-highlight" // Add a class for active state on touch devices
      : ""
    : "hover:bg-secondary"; // Hover background for non-touch devices

  // --- Grouping Reactions Logic ---
  const groupedReactions = message.reactions?.reduce((acc, reaction) => {
    // Ensure reaction.userId is always an object with _id for consistent access
    const reactorId = reaction.userId?._id?.toString() || reaction.userId?.toString();
    const reactorUsername = reaction.userId?.username || "Unknown";
    const reactorProfileImg = reaction.userId?.profileImg || "/avatar-placeholder.png";

    if (!reactorId) return acc; // Skip if userId is not valid

    acc[reaction.emoji] = acc[reaction.emoji] || {
      count: 0,
      users: [], // To display usernames on hover
      userIds: [], // To check if current user reacted
    };

    acc[reaction.emoji].count++;

    // Only add user if not already added to prevent duplicates in 'users' array
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

  const handleDeleteClick = () => {
    onDelete(message._id);
    setIsDropdownOpen(false);
  };

  const handleBanClick = () => {
    if (
      window.confirm(
        `Are you sure you want to ban ${message.sender.username} from the public chat?`
      )
    ) {
      onBan(message.sender._id);
      setIsDropdownOpen(false);
    }
  };

  const handleUnbanClick = () => {
    if (
      window.confirm(
        `Are you sure you want to unban ${message.sender.username} from the public chat?`
      )
    ) {
      onUnban(message.sender._id);
      setIsDropdownOpen(false);
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  return (
    // Outer flex container for message alignment (start/end)
    <div
      key={message._id}
      id={`message-${message._id}`}
      className={`relative mb-4 p-1 rounded-lg ${messageHighlightClass} ${
        fromMe ? "justify-end" : "justify-start"
      }`}
      onMouseEnter={() => handleMouseEnter(message._id)}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => {
        // Prevent click events inside the reaction modal or dropdown from bubbling and closing the modal
        const modalElement = document.getElementById(
          `message-reaction-modal-${message._id}`
        );
        const adminDropdownElement = e.currentTarget.querySelector(".admin-dropdown"); // Select the dropdown if it exists

        if (
          (modalElement && modalElement.contains(e.target)) ||
          (adminDropdownElement && adminDropdownElement.contains(e.target))
        ) {
          return;
        }
        handleMessageTap(message._id); // For touch devices
      }}
    >
      {/* Reaction Picker Modal (absolute positioned) */}
      <div
        id={`message-reaction-modal-${message._id}`}
        className={`absolute -top-5 bg-secondary shadow-sm shadow-primary rounded-xl px-2 flex items-center gap-1 transition-opacity z-10
                ${
                  fromMe
                    ? "-left-16 translate-x-1/2" // Adjust position for sender's messages
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
        {/* You can add more buttons here if you want reply/edit for public chat messages later */}
      </div>

      {/*remove items-end for different position profile */}
      <div
        className={`relative flex gap-2 items-end ${
          fromMe ? "ml-28 flex-row-reverse" : "mr-28 flex-row"
        } `}
      >
        {/* Avatar - Conditionally rendered for other users */}
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
          {/* Header (Username, Admin/Banned badges) - Only for others' messages */}
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
            {isAuthUserAdmin && !fromMe && (
              <div className="absolute right-1 admin-dropdown">
                {" "}
                {/* Added class for click handling */}
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
            )}
          </div>

          {/* Grouped Reactions Display */}
          {Object.keys(groupedReactions || {}).length > 0 && (
            <div
              className={`flex gap-1  items-center py-1 rounded-full text-xs font-semibold
                                ${
                                  fromMe
                                    ? "self-end" // Align to the right if from current user
                                    : "self-start" // Align to the left if from other user
                                }
                                `}
            >
              {Object.entries(groupedReactions).map(([emoji, data]) => {
                const hasCurrentUserReactedToThisEmoji = data.userIds.some(
                  (userId) => userId === authUser._id?.toString()
                );

                // Create a title string with all usernames who reacted with this emoji
                const reactionUsersTitle = data.userIds
                  .map((user) => user.username)
                  .join(", ");

                return (
                  <div
                    key={emoji}
                    className={`flex items-center cursor-pointer text-md rounded-lg px-1.5 py-1.5 transition-colors duration-200
                                    ${
                                      hasCurrentUserReactedToThisEmoji
                                        ? "bg-violet-600/30 border-violet-600 border" // Highlight if current user reacted
                                        : "bg-gray-800 border border-gray-800"
                                    }`}
                    // title={reactionUsersTitle ? `Reacted by: ${reactionUsersTitle}` : ""}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent the main message click handler
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

          {/* Timestamp below the bubble, aligned with the message bubble */}
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
