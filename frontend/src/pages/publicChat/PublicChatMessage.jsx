import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { MdAdminPanelSettings, MdDeleteForever } from "react-icons/md";
import { FaUserSlash, FaUserCheck, FaReply, FaBan } from "react-icons/fa";
import { FiTrash } from "react-icons/fi";
import { MdEdit } from "react-icons/md";
import { PiSmileyFill } from "react-icons/pi";

import {
  useDeleteOwnPublicMessage,
  useDeletePublicMessage,
} from "../../hooks/publicChatHooks/publicChatHooks";
import { renderClickableText } from "../../utils/textUtils";
import { truncateText } from "../../utils/truncateText";
// No need to import formatDate from 'date-fns' if you're defining it locally or from your utils

import EmojiPickerPopover from "../../components/common/EmojiPickerPopover";

// Helper for formatting date (e.g., "July 28, 2025")
const formatDisplayDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) {
    return "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
};

// Helper for formatting time (e.g., "5:02 AM")
const formatDisplayTime = (dateString) => {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true, // Use 12-hour format with AM/PM
  });
};

// --- PublicChatMessage Component ---
const PublicChatMessage = React.memo(function PublicChatMessage({
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
  handleLoadImage,
  isFirstInGroup,
  isLastInGroup,
  onReactionAdded,
  isNewDay, // NEW PROP
}) {
  const { deleteOwnMessage, isDeletingOwnMessage } = useDeleteOwnPublicMessage();
  const { deletePublicMessage: adminDeleteMessage, isPending: isAdminDeleting } =
    useDeletePublicMessage();
  const [isHovered, setIsHovered] = useState(false);

  const [showEmojiPickerPopover, setShowEmojiPickerPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const moreEmojisButtonRef = useRef(null);
  const addReactionButtonRef = useRef(null);

  const [isMobile, setIsMobile] = useState(false);
    const pressTimer = useRef(null);
    const LONG_PRESS_DURATION = 500; // milliseconds
  
    useEffect(() => {
      // Basic mobile detection based on user agent or screen width
      const checkIfMobile = () => {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isMobileDevice =
          /android|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent) ||
          window.innerWidth < 768;
        setIsMobile(isMobileDevice);
      };
  
      checkIfMobile();
      window.addEventListener("resize", checkIfMobile);
      return () => window.removeEventListener("resize", checkIfMobile);
    }, []);

  const handleOpenEmojiPickerPopover = useCallback(
    (e, targetRef) => {
      e.stopPropagation();

      if (showEmojiPickerPopover && targetRef.current === moreEmojisButtonRef.current) {
        setShowEmojiPickerPopover(false);
        return;
      }
      if (showEmojiPickerPopover && targetRef.current === addReactionButtonRef.current) {
        setShowEmojiPickerPopover(false);
        return;
      }

      const buttonRect = targetRef.current.getBoundingClientRect();

      const estimatedPickerWidth = window.innerWidth < 768 ? 280 : 350;
      const estimatedPickerHeight = window.innerWidth < 768 ? 400 : 400;

      let newTop = buttonRect.top - estimatedPickerHeight - 10;
      let newLeft = buttonRect.left + buttonRect.width / 2;

      const padding = 10;

      if (newLeft - estimatedPickerWidth / 2 < padding) {
        newLeft = estimatedPickerWidth / 2 + padding;
      }

      if (newLeft + estimatedPickerWidth / 2 > window.innerWidth - padding) {
        newLeft = window.innerWidth - estimatedPickerWidth / 2 - padding;
      }

      if (newTop < padding) {
        newTop = buttonRect.bottom + 10;
      }

      setPopoverPosition({
        top: newTop,
        left: newLeft,
      });
      setShowEmojiPickerPopover(true);
    },
    [showEmojiPickerPopover]
  );

  const handleCloseEmojiPickerPopover = useCallback(() => {
    setShowEmojiPickerPopover(false);
  }, []);

  const handleEmojiSelect = useCallback(
    (emojiObject) => {
      handleReactionClick(message._id, emojiObject.emoji);
      handleCloseEmojiPickerPopover();
      onReactionAdded();
    },
    [handleReactionClick, message._id, handleCloseEmojiPickerPopover, onReactionAdded]
  );

  const fromMe = message.sender._id === authUser._id;

  const isSenderAdmin = message.sender.isAdmin;
  const isAuthUserAdmin = authUser.isAdmin;
  const isSenderBanned = message.sender.isBannedInPublicChat;
  const isMessageDeleted = message.isDeletedByAdmin || message.isDeletedByUser;
  const isSenderVerified = message.sender.isVerified;
  const isSenderGoldVerified = message.sender.isGoldVerified;
  const isMessageEdited = message.isEdited;

  const isSentByCurrentUser = message.sender?._id === authUser?._id;

  const showModal = activeMessageModalId === message._id;
  const allowedEmojis = ["❤️", "👍", "😂"];

  const shouldShowTimeOnHover = isHovered || showModal;

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

  const hasAnyReactions = Object.keys(groupedReactions || {}).length > 0;
  const messageContentStyle = isMobile
    ? {
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        touchAction: "manipulation",
      }
    : {}; 

  const bubbleClasses = useMemo(() => {
    let classes = "";
    if (isSentByCurrentUser) {
      classes += " bg-primary text-white";
      if (isFirstInGroup && isLastInGroup) {
        classes += " rounded-3xl";
      } else if (isFirstInGroup) {
        classes += " rounded-tl-3xl rounded-bl-3xl rounded-tr-3xl rounded-br-[4px]";
      } else if (isLastInGroup) {
        classes += " rounded-tl-3xl rounded-bl-3xl rounded-tr-[4px] rounded-br-3xl";
      } else {
        classes += " rounded-tl-3xl rounded-bl-3xl rounded-tr-[4px] rounded-br-[4px]";
      }
    } else {
      classes += " bg-[#2F3336] text-white";
      if (isFirstInGroup && isLastInGroup) {
        classes += " rounded-3xl";
      } else if (isFirstInGroup) {
        classes += " rounded-tr-3xl rounded-br-3xl rounded-tl-3xl rounded-bl-[4px]";
      } else if (isLastInGroup) {
        classes += " rounded-tr-3xl rounded-br-3xl rounded-tl-[4px] rounded-bl-3xl";
      } else {
        classes += " rounded-tr-3xl rounded-br-3xl rounded-tl-[4px] rounded-bl-[4px]";
      }
    }
    return classes;
  }, [isSentByCurrentUser, isFirstInGroup, isLastInGroup]);

  const handleAdminDeleteClick = (e) => {
    e.stopPropagation();
    adminDeleteMessage(message._id);
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

  // NEW: Mobile Touch Handlers
  const handleTouchStart = (e) => {
    e.stopPropagation();
    // Start a timer for long press
    pressTimer.current = setTimeout(() => {
      handleMessageTap(message._id); // Show modal after long press
    }, LONG_PRESS_DURATION);
  };

  const handleTouchEnd = (e) => {
    e.stopPropagation();
    clearTimeout(pressTimer.current); // Clear timer if finger lifted before long press
  };

  const handleTouchMove = (e) => {
    // If finger moves significantly, cancel the long press
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  };

  return (
    <>
      {/* Date Separator */}
      {isNewDay && (
        <div className="flex items-center mb-6 mt-7">
          <div className="flex-grow border-t border-gray-700"></div>
          <div className="px-2 text-slate-400 text-xs flex-shrink-0">
            {formatDisplayDate(message.createdAt)}
          </div>
          <div className="flex-grow border-t border-gray-700"></div>
        </div>
      )}

      <div
        key={message._id}
        id={`message-${message._id}`}
        className={`relative mb-0 p-[1px] rounded-lg hover:bg-secondary ${
          fromMe ? "justify-end" : "justify-start"
        } ${isFirstInGroup ? "mt-4" : ""}`}
        style={messageContentStyle}
        onMouseEnter={() => {
          handleMouseEnter(message._id);
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          handleMouseLeave();
          setIsHovered(false);
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
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        onTouchMove={isMobile ? handleTouchMove : undefined}
      >
        {/* No longer showing time on hover here, it's next to username/avatar */}
        {/* Reaction Picker and Action Modal (absolute positioned) */}
        <div
          id={`message-reaction-modal-${message._id}`}
          className={`absolute -top-5 bg-secondary shadow-sm shadow-primary rounded-xl px-2 flex items-center gap-1 transition-opacity z-10
                      ${
                        fromMe ? "-left-28 translate-x-1/2" : "-right-20 -translate-x-1/2"
                      }
                      ${
                        showModal
                          ? "opacity-100 pointer-events-auto"
                          : "opacity-0 pointer-events-none"
                      } `}
          style={messageContentStyle}
        >
          {/* Emojis */}
          {allowedEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={(e) => {
                e.stopPropagation();
                handleReactionClick(message._id, emoji);
                onReactionAdded();
              }}
              className={`text-xl hover:scale-125 py-1 transition duration-100`}
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          <div className="w-px h-6 bg-slate-500 mx-1"></div>
          <button
            ref={moreEmojisButtonRef}
            onClick={(e) => handleOpenEmojiPickerPopover(e, moreEmojisButtonRef)}
            className="text-amber-400 hover:text-amber-500 md:hover:scale-125 duration-100 transtion border-slate-500 mt-[1px]"
            title="More Emojis"
          >
            <PiSmileyFill className="size-[26px]" />
          </button>
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
          {fromMe && !isMessageDeleted && (
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
            fromMe ? "ml-16 flex-row-reverse" : "mr-16 flex-row"
          } `}
          style={messageContentStyle}
        >
          {/* Avatar - Only show if it's the first message in a group and not from current user */}
          {!fromMe && isFirstInGroup && (
            <div className="flex-shrink-0">
              <Link to={`/profile/${message.sender.username}`}>
                <img
                  alt="User Avatar"
                  src={message.sender.profileImg || "/avatar-placeholder.png"}
                  className="size-9 rounded-full object-cover mt-0.5" // Adjusted margin to align better
                />
              </Link>
            </div>
          )}

          {/* Spacer for non-first messages to align with avatar */}
          {!fromMe && !isFirstInGroup && <div className="w-9 flex-shrink-0" />}

          {/* Message Content and Timestamp Wrapper */}
          <div
            className={`flex flex-col ${
              fromMe ? "items-end" : "items-start"
            } flex-grow w-full min-w-0`}
          >
            {/* Header (Username, Admin/Banned badges, and Time) */}

            {isFirstInGroup && (
              <div
                className={`flex items-center text-sm  ${
                  fromMe ? "justify-end" : "justify-start"
                }`}
              >
                {!fromMe && (
                  <Link
                    to={`/profile/${message.sender.username}`}
                    className={`font-semibold mr-1 ${
                      isSenderVerified
                        ? "text-[#1D9BF0]"
                        : isSenderGoldVerified
                        ? "text-[#E3B812]"
                        : "text-white"
                    }`}
                  >
                    {message.sender.username}
                  </Link>
                )}
                {isSenderVerified && !fromMe && (
                  <img src="/verified.png" className="size-[17px] mr-1" />
                )}
                {isSenderGoldVerified && !fromMe && (
                  <img src="/gold-verified.png" className="size-[17px]" />
                )}

                {isSenderAdmin && !fromMe && (
                  <span>
                    <MdAdminPanelSettings size={20} className="mb-[1px] fill-green-500" />
                  </span>
                )}
                {isSenderBanned && !fromMe && (
                  <span>
                    <FaBan size={15} className="fill-red-500 mr-1" />
                  </span>
                )}

                <span className="text-xs text-gray-500">
                  {formatDisplayTime(message.createdAt)}
                </span>
              </div>
            )}

            {isMessageEdited && message.content && (
              <span
                className={`text-xs ml-1 italic text-gray-500 ${
                  fromMe ? "self-end mr-1" : "self-start"
                }`}
              >
                (Edited)
              </span>
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
                        {renderClickableText(truncateText(message.replyTo.content, 49))}
                      </span>
                    )
                  )}
                  {message.replyTo.img && (
                    <img
                      src={message.replyTo.img}
                      onLoad={handleLoadImage}
                      onError={handleLoadImage}
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
                <span className="italic text-sm text-gray-400 ">[Message Deleted]</span>
              ) : (
                <>
                  {message.img && (
                    <div className="mb-2 max-w-[200px] h-auto rounded-lg overflow-hidden shadow-md border border-gray-600 cursor-pointer">
                      <img
                        src={message.img}
                        onLoad={handleLoadImage}
                        onError={handleLoadImage}
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

            {hasAnyReactions && (
              <div
                className={`flex gap-1 flex-wrap items-center pt-0.5 rounded-full text-xs font-semibold
                                ${isSentByCurrentUser ? "justify-end" : "justify-start"}
                                relative`}
                style={messageContentStyle}
              >
                {/* Render "Add Reaction" button BEFORE reactions if sent by current user */}
                {isSentByCurrentUser && (
                  <button
                    ref={addReactionButtonRef}
                    onClick={(e) => handleOpenEmojiPickerPopover(e, addReactionButtonRef)}
                    className={`
                                    text-gray-400 hover:text-gray-200
                                    size-[30px] rounded-lg flex items-center justify-center
                                    transition-colors duration-200 ease-in-out
                                     hover:bg-gray-700
                                    bg-gray-800
                                `}
                    title="Add reaction"
                  >
                    <PiSmileyFill className="size-5" />
                  </button>
                )}

                {Object.entries(groupedReactions).map(([emoji, data]) => {
                  const hasCurrentUserReactedToThisEmoji = data.userIds.some(
                    (userId) => userId === authUser._id?.toString()
                  );

                  const reactionUsersTitle = data.users
                    .map((user) => user.username || "Unknown")
                    .join(", ");

                  return (
                    <div
                      key={emoji}
                      className={`flex items-center cursor-pointer text-md rounded-lg px-1.5 py-1.5 ${
                        hasCurrentUserReactedToThisEmoji
                          ? "bg-violet-600/30 border-violet-600 border"
                          : "bg-gray-800 border border-gray-800"
                      }`}
                      style={messageContentStyle}
                      title={
                        reactionUsersTitle ? `Reacted by: ${reactionUsersTitle}` : ""
                      }
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

                {/* Render "Add Reaction" button AFTER reactions if sent by other user */}
                {!isSentByCurrentUser && (
                  <button
                    ref={addReactionButtonRef}
                    onClick={(e) => handleOpenEmojiPickerPopover(e, addReactionButtonRef)}
                    className={`
                                    text-gray-400 hover:text-gray-200
                                    size-[30px] rounded-lg flex items-center justify-center
                                    transition-colors duration-200 ease-in-out
                                    border border-transparent hover:bg-gray-700
                                    bg-gray-800
                                `}
                    title="Add reaction"
                  >
                    <PiSmileyFill className="size-5" />
                  </button>
                )}
              </div>
            )}
            {showEmojiPickerPopover && (
              <EmojiPickerPopover
                position={popoverPosition}
                onClose={handleCloseEmojiPickerPopover}
                onEmojiClick={handleEmojiSelect}
                triggerRef={
                  addReactionButtonRef.current && showEmojiPickerPopover
                    ? addReactionButtonRef
                    : moreEmojisButtonRef
                }
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
});

export default PublicChatMessage;
