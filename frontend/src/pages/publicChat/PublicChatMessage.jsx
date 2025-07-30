import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { MdAdminPanelSettings, MdDeleteForever } from "react-icons/md";
import { FaUserSlash, FaUserCheck, FaReply, FaBan } from "react-icons/fa";
import { FiTrash } from "react-icons/fi";
import { MdEdit } from "react-icons/md";
import { PiSmileyFill } from "react-icons/pi";
import { BsThreeDots } from "react-icons/bs"; // Import BsThreeDots

import {
  useDeleteOwnPublicMessage,
  useDeletePublicMessage,
} from "../../hooks/publicChatHooks/publicChatHooks";
import { renderClickableText } from "../../utils/textUtils";
import { truncateText } from "../../utils/truncateText";

import EmojiPickerPopover from "../../components/common/EmojiPickerPopover";
import { HiOutlineReply } from "react-icons/hi";
import { IoCopy } from "react-icons/io5";
import { showAppToast } from "../../utils/showAppToast";

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
    hour12: false, // Use 12-hour format with AM/PM
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
  const { adminDeletePublicMessage: adminDeleteMessage, isPending: isAdminDeleting } =
    useDeletePublicMessage();
  const [isHovered, setIsHovered] = useState(false);

  const [showEmojiPickerPopover, setShowEmojiPickerPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const moreEmojisButtonRef = useRef(null);
  const addReactionButtonRef = useRef(null);
  const moreActionsButtonRef = useRef(null); // Ref for the new More Actions button

  const [showMoreActionsModal, setShowMoreActionsModal] = useState(false); // State for the new modal
  const [moreActionsModalPosition, setMoreActionsModalPosition] = useState({
    top: 0,
    left: 0,
  });

  const [isMobile, setIsMobile] = useState(false);
  const pressTimer = useRef(null);
  const LONG_PRESS_DURATION = 500; // milliseconds
  const fromMe = message.sender._id === authUser._id;
  useEffect(() => {
    const checkIfMobile = () => {
      const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isTouchDevice || isSmallScreen);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const handleOpenEmojiPickerPopover = useCallback(
    (e, targetRef) => {
      e.stopPropagation();
      setShowMoreActionsModal(false); // Close more actions modal if open

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

  // --- Handlers for More Actions Modal ---
  const handleOpenMoreActionsModal = useCallback(
    (e) => {
      e.stopPropagation();
      setShowEmojiPickerPopover(false); // Close emoji picker if open

      // Toggle functionality: if already open, close it
      if (showMoreActionsModal) {
        setShowMoreActionsModal(false);
        return;
      }

      const buttonRect = e.currentTarget.getBoundingClientRect();
      // Estimate modal height based on actions available
      // Reply, Edit (optional), Delete (optional), Admin Ban/Unban (optional)
      const isEditable = fromMe && !message.isDeletedByAdmin && !message.isDeletedByUser;
      const canDeleteOwn =
        fromMe && !message.isDeletedByAdmin && !message.isDeletedByUser;
      const canAdminActions = authUser.isAdmin && !fromMe;

      let numItems = 1; // Always has Reply
      if (isEditable) numItems += 1; // Add Edit
      if (canDeleteOwn || canAdminActions) numItems += 1; // Add Delete (own) or Admin actions

      const itemHeight = 45; // px per action item (approximate, including padding)
      const estimatedModalHeight = numItems * itemHeight + 10; // Add some vertical padding for the modal itself

      const modalWidth = 180; // Approximate width of the modal

      // Calculate newLeft to position the modal to the left of the button.
      const offsetLeft = 5; // Small offset for visual spacing
      let newLeft = buttonRect.left - modalWidth - offsetLeft;

      // Ensure the modal doesn't go off the left edge of the screen
      if (newLeft < 10) {
        newLeft = 10; // Minimum 10px padding from the left edge
      }

      // Calculate newTop to align the vertical middle of the modal with the vertical middle of the button.
      let newTop = buttonRect.top + buttonRect.height / 2 - estimatedModalHeight / 2;

      // Ensure the modal doesn't go off the top or bottom edge of the screen
      const paddingVertical = 10; // Minimum padding from top/bottom viewport edge
      if (newTop < paddingVertical) {
        newTop = paddingVertical;
      }
      if (newTop + estimatedModalHeight > window.innerHeight - paddingVertical) {
        newTop = window.innerHeight - estimatedModalHeight - paddingVertical;
      }

      setMoreActionsModalPosition({ top: newTop, left: newLeft });
      setShowMoreActionsModal(true);
    },
    [
      showMoreActionsModal,
      fromMe,
      message.isDeletedByAdmin,
      message.isDeletedByUser,
      authUser.isAdmin,
    ]
  );

  const handleCloseMoreActionsModal = useCallback(() => {
    setShowMoreActionsModal(false);
  }, []);

  const copyMessageToClipboard = useCallback(async () => {
    if (message.content) {
      try {
        await navigator.clipboard.writeText(message.content);
        // showAppToast("Message copied to clipboard")
      } catch (err) {
        console.error("Failed to copy message: ", err);
        // Handle error (e.g., show an error message to the user)
      }
    }
  }, [message.content]);

  const handleActionClick =
    (actionFn, ...args) =>
    (e) => {
      e.stopPropagation();
      actionFn(...args);
      handleMessageTap(null); // Close main reaction modal
      handleCloseMoreActionsModal(); // Close this modal
    };

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
  const isMessageHighlighted = isHovered || showModal;

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

  const handleReplyingToClick = (e) => {
    e.stopPropagation();
    if (message.replyTo && message.replyTo._id) {
      onJumpToMessage(message.replyTo._id);
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
        className={`relative mb-0 p-[1px] rounded-lg ${
          isMessageHighlighted ? "bg-secondary" : ""
        } ${fromMe ? "justify-end" : "justify-start"} ${isFirstInGroup ? "mt-4" : ""}`}
        style={messageContentStyle}
        onMouseEnter={() => {
          if (!isMobile) {
            handleMouseEnter(message._id);
            setIsHovered(true);
          }
        }}
        onMouseLeave={() => {
          if (!isMobile) {
            handleMouseLeave();
            setIsHovered(false);
          }
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
        {/* Main Reaction Picker and Action Modal */}
        <div
          id={`message-reaction-modal-${message._id}`}
          className={`absolute -top-5 bg-base-100 gray-shadow rounded-xl px-2 flex items-center gap-1 transition-opacity z-10
          ${fromMe ? "-left-24 translate-x-1/2" : "-right-24 -translate-x-1/2"}
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
            className=" text-slate-500 group hover:text-slate-400 hover:bg-secondary rounded-lg duration-100 transtion"
            title="More Emojis"
          >
            <PiSmileyFill size={27} className="group-hover:scale-110 p-[3px]" />
          </button>
          <button
            onClick={handleActionClick(onReply, message)}
            className="p-1 text-slate-500 group hover:text-slate-400 hover:bg-secondary rounded-lg transition duration-100"
            title="Reply to message"
          >
            <HiOutlineReply size={18} className="group-hover:scale-110" />
          </button>
          {/* New "More Actions" button */}
          <button
            ref={moreActionsButtonRef}
            onClick={handleOpenMoreActionsModal}
            className="text-slate-500 group hover:text-slate-400 hover:bg-secondary rounded-lg p-1 transition duration-100"
            title="More actions"
          >
            <BsThreeDots size={18} className="group-hover:scale-110" />
          </button>
        </div>

        {/* --- Discord-like "More Actions" Modal --- */}
        {showMoreActionsModal && (
          <div className="fixed inset-0 z-20" onClick={handleCloseMoreActionsModal}>
            <div
              className={`absolute bg-base-100 gray-shadow rounded-xl p-2 z-30`}
              style={{
                top: moreActionsModalPosition.top,
                left: moreActionsModalPosition.left,
                minWidth: "180px", // Ensure a consistent minimum width
              }}
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
              <button
                onClick={handleActionClick(onReply, message)}
                className="flex justify-between rounded-md items-center gap-2 w-full px-3 py-1.5 text-slate-300 hover:bg-secondary transition duration-200"
              >
                Reply
                <HiOutlineReply size={18} className="text-slate-400" />
              </button>
              {message.content && (
                <button
                  onClick={handleActionClick(copyMessageToClipboard, message)}
                  className="flex justify-between items-center gap-2 rounded-md w-full px-3 py-1.5 text-slate-300 hover:bg-secondary duration-200 transition"
                >
                  Copy Text
                  <IoCopy size={18} className="text-slate-400" />
                </button>
              )}
              {fromMe && !isMessageDeleted && (
                <button
                  onClick={handleActionClick(() => {
                    onEdit(message);
                    setReplyingToMessage(null);
                  })}
                  className="flex justify-between rounded-md items-center gap-2 w-full px-3 py-1.5 text-slate-300 hover:bg-secondary transition duration-200"
                >
                  Edit Message
                  <MdEdit size={16} className="text-slate-400" />
                </button>
              )}
              {fromMe && !isMessageDeleted && (
                <button
                  onClick={handleActionClick(deleteOwnMessage, message._id)}
                  disabled={isDeletingOwnMessage}
                  className="flex justify-between rounded-md items-center gap-2 w-full px-3 py-1.5 text-red-400 hover:bg-red-400/10 transition duration-200"
                >
                  Delete Message
                  <FiTrash size={16} />
                </button>
              )}
              {isAuthUserAdmin && !fromMe && (
                <>
                  {!isMessageDeleted && (
                    <button
                      onClick={handleActionClick(adminDeleteMessage, message._id)}
                      disabled={isAdminDeleting}
                      className="flex justify-between rounded-md items-center gap-2 w-full px-3 py-1.5 text-red-400 hover:bg-red-400/10 transition duration-200"
                    >
                      Delete (Admin)
                      <MdDeleteForever size={18} />
                    </button>
                  )}
                  {isSenderBanned ? (
                    <button
                      onClick={handleActionClick(onUnban, message.sender._id)}
                      className="flex justify-between rounded-md items-center gap-2 w-full px-3 py-1.5 text-green-400 hover:bg-green-400/10 transition duration-200"
                    >
                      Unban User
                      <FaUserCheck size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={handleActionClick(onBan, message.sender._id)}
                      className="flex justify-between rounded-md items-center gap-2 w-full px-3 py-1.5 text-red-400 hover:bg-red-400/10 transition duration-200"
                    >
                      Ban User
                      <FaUserSlash size={16} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

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

          {shouldShowTimeOnHover && !isSentByCurrentUser && !isFirstInGroup && (
            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 mr-2 z-0 whitespace-nowrap">
              {formatDisplayTime(message.createdAt)}
            </div>
          )}
          {shouldShowTimeOnHover && isSentByCurrentUser && !isFirstInGroup && (
            <div className="absolute -left-[58px] top-1/2 -translate-y-1/2 text-xs text-gray-400 mr-2 z-0 whitespace-nowrap">
              {formatDisplayTime(message.createdAt)}
            </div>
          )}
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
                  <img src="/gold-verified.png" className="size-[17px] mr-1" />
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
                        {renderClickableText(truncateText(message.replyTo.content, 20))}
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
                          : "bg-gray-800 border border-gray-800 hover:bg-gray-700 transition duration-200"
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
