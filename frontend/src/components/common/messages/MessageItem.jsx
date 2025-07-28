import React, { useState, useRef, useCallback, useEffect } from "react";
import { FaCircle, FaReply } from "react-icons/fa";
import { FiTrash } from "react-icons/fi";
import { BsCheck2, BsCheck2All, BsThreeDots } from "react-icons/bs"; // Import BsThreeDots
import { MdEdit } from "react-icons/md";
import { PiSmileyFill } from "react-icons/pi";
import { useNavigate } from "react-router-dom";
import { HiOutlineReply } from "react-icons/hi";


import { truncateText } from "../../../utils/truncateText";
import { renderClickableText } from "../../../utils/textUtils";
import EmojiPickerPopover from "../EmojiPickerPopover";
import { IoCopy } from "react-icons/io5";


const MessageItem = ({
  msg,
  activeMessageModalId,
  handleMouseEnter,
  handleMouseLeave,
  handleMessageTap,
  handleDeleteClick,
  handleReplyClick,
  handleImageClick,
  handleJumpToOriginalMessage,
  handleReactionClick,
  currentUser,
  setEditingMessage,
  isTypingOtherUser,
  onReactionAdded,
  setReplyingToMessage,
  senderProfileImg,
  senderUsername,
  isFirstInGroup,
  isLastInGroup,
  handleLoadImage,
  showHeaderInfo,
  isNewDay,
}) => {
  const navigate = useNavigate();

  const [isHovered, setIsHovered] = useState(false);
  const [showEmojiPickerPopover, setShowEmojiPickerPopover] = useState(false);
  const [showMoreActionsModal, setShowMoreActionsModal] = useState(false); // New state for more actions modal
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [moreActionsModalPosition, setMoreActionsModalPosition] = useState({
    top: 0,
    left: 0,
  }); // New state for more actions modal position

  const moreEmojisButtonRef = useRef(null);
  const addReactionButtonRef = useRef(null);
  const moreButtonRef = useRef(null); // Ref for the new "More" button

  const [isMobile, setIsMobile] = useState(false);
  const pressTimer = useRef(null);
  const LONG_PRESS_DURATION = 500;

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

  // --- Handlers for Emoji Picker Popover ---
  const handleOpenEmojiPickerPopover = useCallback(
    (e) => {
      e.stopPropagation();
      setShowMoreActionsModal(false); // Close more actions modal if open
      if (showEmojiPickerPopover) {
        setShowEmojiPickerPopover(false);
        return;
      }

      const buttonRect = e.currentTarget.getBoundingClientRect();
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

      setPopoverPosition({ top: newTop, left: newLeft });
      setShowEmojiPickerPopover(true);
    },
    [showEmojiPickerPopover]
  );

  const handleCloseEmojiPickerPopover = useCallback(() => {
    setShowEmojiPickerPopover(false);
  }, []);

  const handleEmojiSelect = useCallback(
    (emojiObject) => {
      handleReactionClick(msg._id, emojiObject.emoji);
      handleCloseEmojiPickerPopover();
      onReactionAdded();
    },
    [handleReactionClick, msg._id, handleCloseEmojiPickerPopover, onReactionAdded]
  );

  const handleCloseMoreActionsModal = useCallback(() => {
    setShowMoreActionsModal(false);
  }, []);

  const handleActionClick =
    (actionFn, ...args) =>
    (e) => {
      e.stopPropagation();
      actionFn(...args);
      handleMessageTap(null); // Close main modal
      handleCloseMoreActionsModal(); // Close more actions modal
    };

  const isSentByCurrentUser =
    (typeof msg.sender === "object" && msg.sender?._id === currentUser._id) ||
    (typeof msg.sender === "string" && msg.sender === currentUser._id);

  const isEditable = isSentByCurrentUser && msg.text && !msg.img;
  const showModal = activeMessageModalId === msg._id;
  const allowedEmojis = ["❤️", "👍", "😂"];

  const groupedReactions = msg.reactions?.reduce((acc, reaction) => {
    acc[reaction.emoji] = acc[reaction.emoji] || {
      count: 0,
      users: [],
      userIds: [],
    };
    acc[reaction.emoji].count++;

    const reactorId = reaction.user?._id?.toString() || reaction.user?.toString();
    if (reactorId) {
      acc[reaction.emoji].userIds.push(reactorId);
    }
    return acc;
  }, {});

  const hasAnyReactions = Object.keys(groupedReactions || {}).length > 0;

  const handleOpenMoreActionsModal = useCallback(
    (e) => {
      e.stopPropagation();
      setShowEmojiPickerPopover(false);
      if (showMoreActionsModal) {
        setShowMoreActionsModal(false);
        return;
      }

      const buttonRect = e.currentTarget.getBoundingClientRect();
      const modalWidth = 180; // Approximate width of the Discord-like modal
      // We need to accurately estimate the modalHeight to center it vertically.
      // Let's assume a button height of 36px (from the modal buttons' p-1 which often translates to more)
      // and each button in the "More Actions" modal is roughly 30px (py-1.5 + some padding/border).
      // Reply (30) + Edit (30) + Delete (30) = 90px + py-1 (total for modal)
      // A safer estimate for modalHeight can be derived from the number of items:
      const itemHeight = 38; // px per action item (approximate, including padding)
      const numItems = isEditable ? 3 : 2; // Reply, Edit, Delete (3) or Reply, Delete (2)
      const estimatedModalHeight = numItems * itemHeight + 10; // Add some vertical padding for the modal itself

      const modalHeight = estimatedModalHeight;

      // Calculate newLeft to position the modal to the left of the button.
      let newLeft = buttonRect.left - modalWidth;

      // Add a small offset (e.g., 5-10px) to the left for better visual spacing.
      const offsetLeft = 5;
      newLeft = buttonRect.left - modalWidth - offsetLeft;

      // Ensure the modal doesn't go off the left edge of the screen
      if (newLeft < 10) {
        // Keep a minimum 10px padding from the left edge
        newLeft = 10;
      }

      // Calculate newTop to align the vertical middle of the modal with the vertical middle of the button.
      // `buttonRect.top + buttonRect.height / 2` gives the vertical center coordinate of the button.
      // `modalHeight / 2` is half the height of the modal.
      // Subtracting `modalHeight / 2` from the button's center aligns the modal's center with the button's center.
      let newTop = buttonRect.top + buttonRect.height / 2 - modalHeight / 2;

      // Ensure the modal doesn't go off the top or bottom edge of the screen
      const paddingVertical = 10; // Minimum padding from top/bottom viewport edge
      if (newTop < paddingVertical) {
        // If it goes off the top
        newTop = paddingVertical;
      }
      if (newTop + modalHeight > window.innerHeight - paddingVertical) {
        // If it goes off the bottom
        newTop = window.innerHeight - modalHeight - paddingVertical;
      }

      setMoreActionsModalPosition({ top: newTop, left: newLeft });
      setShowMoreActionsModal(true);
    },
    [showMoreActionsModal, isEditable]
  );

  const copyMessageToClipboard = useCallback(async () => {
    if (msg.text) {
      try {
        await navigator.clipboard.writeText(msg.text);
        // Optionally, add a visual feedback like a toast notification
      } catch (err) {
        console.error("Failed to copy message: ", err);
        // Handle error (e.g., show an error message to the user)
      }
    }
  }, [msg.text]);
  // Helper for formatting time (e.g., "10:30 AM")
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

  let bubbleClasses = "";
  if (isSentByCurrentUser) {
    bubbleClasses += " bg-primary text-white";
    if (isFirstInGroup && isLastInGroup) {
      bubbleClasses += " rounded-3xl";
    } else if (isFirstInGroup) {
      bubbleClasses += " rounded-tl-3xl rounded-bl-3xl rounded-tr-3xl rounded-br-[4px]";
    } else if (isLastInGroup) {
      bubbleClasses += " rounded-tl-3xl rounded-bl-3xl rounded-tr-[4px] rounded-br-3xl";
    } else {
      bubbleClasses += " rounded-tl-3xl rounded-bl-3xl rounded-tr-[4px] rounded-br-[4px]";
    }
  } else {
    bubbleClasses += " bg-[#2F3336] text-white";
    if (isFirstInGroup && isLastInGroup) {
      bubbleClasses += " rounded-3xl";
    } else if (isFirstInGroup) {
      bubbleClasses += " rounded-tr-3xl rounded-br-3xl rounded-tl-3xl rounded-bl-[4px]";
    } else if (isLastInGroup) {
      bubbleClasses += " rounded-tr-3xl rounded-br-3xl rounded-tl-[4px] rounded-bl-3xl";
    } else {
      bubbleClasses += " rounded-tr-3xl rounded-br-3xl rounded-tl-[4px] rounded-bl-[4px]";
    }
  }

  const shouldShowTimeOnHover = isHovered || showModal;
  const isMessageHighlighted = isHovered || showModal;
  const messageContentStyle = isMobile
    ? {
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        touchAction: "manipulation",
      }
    : {};

  const handleTouchStart = (e) => {
    e.stopPropagation();
    pressTimer.current = setTimeout(() => {
      handleMessageTap(msg._id);
    }, LONG_PRESS_DURATION);
  };

  const handleTouchEnd = (e) => {
    e.stopPropagation();
    clearTimeout(pressTimer.current);
  };

  const handleTouchMove = (e) => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  };
  

  // NEW: Typing Indicator MessageItem
  if (isTypingOtherUser) {
    return (
      <div className="flex justify-start p-1 rounded-lg message-item-container ml-10">
        <div className="flex flex-col max-w-[70%] p-3 rounded-3xl bg-[#2F3336] text-white rounded-bl-[4px]">
          <span className="flex items-center gap-0.5">
            <span className="inline-block pulsing-dot pulsing-dot-1">
              <FaCircle size={6} />
            </span>
            <span className="inline-block pulsing-dot pulsing-dot-2">
              <FaCircle size={6} />
            </span>
            <span className="inline-block pulsing-dot pulsing-dot-3">
              <FaCircle size={6} />
            </span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Date Separator */}
      {isNewDay && (
        <div className="flex items-center mb-6 mt-7">
          <div className="flex-grow border-t border-gray-700"></div>
          <div className="px-2 text-slate-400 text-xs flex-shrink-0">
            {formatDate(msg.createdAt)}
          </div>
          <div className="flex-grow border-t border-gray-700"></div>
        </div>
      )}

      <div
        id={`message-${msg._id}`}
        className={`relative mb-0 p-[1px] rounded-lg ${
          isMessageHighlighted ? "bg-secondary" : ""
        } ${isFirstInGroup ? "mt-2" : ""} `}
        onMouseEnter={() => {
          if (!isMobile) {
            handleMouseEnter(msg._id);
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
          if (isMobile) {
            if (showModal) {
              handleMessageTap(null);
            }
            e.stopPropagation();
          } else {
            const modalElement = document.getElementById(`message-modal-${msg._id}`);
            if (modalElement && modalElement.contains(e.target)) {
              return;
            }
            handleMessageTap(msg._id);
          }
        }}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        onTouchMove={isMobile ? handleTouchMove : undefined}
      >
        {/* Main Reaction Picker and Action Modal */}
        <div
          id={`message-modal-${msg._id}`}
          className={`absolute -top-5 bg-base-100 gray-shadow rounded-xl px-2 flex items-center gap-1 z-10
          ${
            isSentByCurrentUser
              ? "-left-24 translate-x-1/2"
              : "-right-24 -translate-x-1/2"
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
                e.stopPropagation();
                handleReactionClick(msg._id, emoji);
                onReactionAdded();
              }}
              className="text-xl md:hover:scale-125 py-1 transition duration-100"
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          <div className="w-px h-6 bg-slate-500 mx-1"></div>
          <button
            ref={moreEmojisButtonRef}
            onClick={handleOpenEmojiPickerPopover}
            className="text-slate-500 group hover:text-slate-400 duration-100 hover:bg-secondary rounded-md transtion border-slate-500 mt-[1px]"
            title="More Emojis"
          >
            <PiSmileyFill size={27} className="group-hover:scale-110 p-[3px]" />
          </button>
          <button
            onClick={handleActionClick(handleReplyClick, msg)}
            className="p-1 text-slate-500 group hover:text-slate-400 rounded-md hover:bg-secondary transition duration-100"
            title="Reply to message"
          >
            <HiOutlineReply size={18} className="group-hover:scale-110" />
          </button>
          {/* New "More" button */}
          <button
            ref={moreButtonRef}
            onClick={handleOpenMoreActionsModal}
            className="text-slate-500 hover:text-slate-400 group hover:bg-secondary rounded-md transition duration-100 p-1"
            title="More actions"
          >
            <BsThreeDots size={18} className="group-hover:scale-110" />
          </button>
        </div>

        {/* --- Discord-like "More Actions" Modal --- */}
        {showMoreActionsModal && (
          <div
            className="fixed inset-0 z-20" // Fixed overlay to close on outside click
            onClick={handleCloseMoreActionsModal}
          >
            <div
              className={`absolute p-2 bg-base-100 rounded-xl gray-shadow  z-30`}
              style={{
                top: moreActionsModalPosition.top,
                left: moreActionsModalPosition.left,
                minWidth: "180px", // Adjust width as needed
              }}
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
              <button
                onClick={handleActionClick(handleReplyClick, msg)}
                className="flex justify-between items-center gap-2 rounded-md w-full px-3 py-1.5 text-slate-300 hover:bg-secondary duration-200 transition"
              >
                Reply
                <HiOutlineReply size={18} className="text-slate-400" />
              </button>
              {msg.text && (
                <button
                  onClick={handleActionClick(copyMessageToClipboard)}
                  className="flex justify-between items-center gap-2 rounded-md w-full px-3 py-1.5 text-slate-300 hover:bg-secondary duration-200 transition"
                >
                  Copy Text
                  <IoCopy size={18} className="text-slate-400" />
                </button>
              )}
              {isEditable && (
                <button
                  onClick={handleActionClick(() => {
                    setEditingMessage(msg);
                    setReplyingToMessage(null);
                  })}
                  className="flex justify-between items-center gap-2 rounded-md w-full px-3 py-1.5 text-slate-300 hover:bg-secondary duration-200 transition"
                >
                  Edit Message
                  <MdEdit size={16} className="text-slate-400" />
                </button>
              )}
              {isSentByCurrentUser && (
                <button
                  onClick={handleActionClick(handleDeleteClick, {
                    messageId: msg._id,
                    conversationId: msg.conversationId,
                  })}
                  className="flex justify-between items-center gap-2 rounded-md w-full px-3 py-1.5 text-red-400 hover:bg-red-400/10 duration-200 transition"
                >
                  Delete Message
                  <FiTrash size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Message Content Layout */}
        <div
          className={`relative flex gap-2 items-start ${
            isSentByCurrentUser ? "justify-end" : "justify-start"
          }`}
        >
          {/* Avatar - Only for other user's first message in a group */}
          {!isSentByCurrentUser && isFirstInGroup && (
            <div className="flex-shrink-0 items-start">
              <img
                alt={`${senderUsername}'s profile`}
                src={senderProfileImg || "/avatar-placeholder.png"}
                onLoad={handleLoadImage}
                className="size-9 rounded-full object-cover mt-0.5 cursor-pointer"
                onClick={() => navigate(`/profile/${senderUsername}`)}
              />
            </div>
          )}

          {!isSentByCurrentUser && !isFirstInGroup && (
            <div className="w-8 h-8 mr-1"></div>
          )}

          {shouldShowTimeOnHover && !isSentByCurrentUser && !showHeaderInfo && (
            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 mr-2 z-0 whitespace-nowrap">
              {formatTime(msg.createdAt)}
            </div>
          )}
          {shouldShowTimeOnHover && isSentByCurrentUser && !showHeaderInfo && (
            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 mr-2 z-0 whitespace-nowrap">
              {formatTime(msg.createdAt)}
            </div>
          )}

          {/* This container holds the main content */}
          <div
            className={`flex flex-col ${
              isSentByCurrentUser ? "items-end" : "items-start"
            } w-fit max-w-[75%]`}
          >
            {isFirstInGroup && (
              <div
                className={`flex items-center gap-1 text-sm mb-0.5 ${
                  isSentByCurrentUser ? "justify-end" : "justify-start"
                }`}
              >
                {!isSentByCurrentUser && (
                  <span
                    onClick={() => navigate(`/profile/${senderUsername}`)}
                    className="font-semibold cursor-pointer"
                  >
                    {senderUsername}
                  </span>
                )}
                <span className="text-xs text-gray-500 mr-5">
                  {formatTime(msg.createdAt)}
                </span>
              </div>
            )}

            {/* Edited Status */}
            {msg.isEdited && msg.text && (
              <span
                className={`text-xs italic text-gray-500 mr-5 ${
                  isSentByCurrentUser ? "self-end" : "self-start"
                }`}
              >
                (Edited)
              </span>
            )}
            <div className="flex">
              {/* Chat Bubble Container */}
              <div
                className={`flex items-end gap-2 ${
                  isSentByCurrentUser ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`p-3 flex flex-col w-full overflow-hidden ${bubbleClasses}`}
                  style={messageContentStyle}
                >
                  {/* Reply Block */}
                  {msg.repliedTo && (
                    <div
                      className={`
                    mb-2 p-2 rounded-md text-xs border
                    ${
                      isSentByCurrentUser
                        ? "border-gray-600 bg-blue-300 bg-opacity-30 border-l-4"
                        : "border-blue-300 bg-gray-950 bg-opacity-30 border-r-4"
                    }
                    flex flex-col cursor-pointer transition-colors duration-200 ease-in-out
                    hover:border-blue-400 hover:bg-opacity-40
                  `}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJumpToOriginalMessage(msg.repliedTo._id);
                      }}
                    >
                      <span
                        className={`font-bold ${
                          isSentByCurrentUser ? "text-gray-600" : "text-gray-300"
                        }`}
                      >
                        Replying to:
                      </span>
                      {msg.repliedTo.text && (
                        <span
                          className={`font-bold truncate ${
                            isSentByCurrentUser ? "text-gray-600" : "text-gray-300"
                          } mt-1 italic`}
                        >
                          {renderClickableText(truncateText(msg.repliedTo.text, 20))}
                        </span>
                      )}
                      {msg.repliedTo.img && (
                        <img
                          src={msg.repliedTo.img}
                          onLoad={handleLoadImage}
                          onError={handleLoadImage}
                          alt="replied message attachment"
                          className="mt-1 rounded-md max-w-[100px] max-h-[100px] object-cover"
                        />
                      )}
                    </div>
                  )}
                  {/* Image */}
                  {msg.img && (
                    <img
                      src={msg.img}
                      onLoad={handleLoadImage}
                      onError={handleLoadImage}
                      alt="message attachment"
                      className="mt-2 rounded-lg max-w-[200px] w-full h-auto object-cover cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageClick(msg.img, e);
                      }}
                    />
                  )}
                  {/* Message Text */}
                  {msg.text && (
                    <p
                      className={`whitespace-pre-wrap text-sm ${
                        isSentByCurrentUser ? "text-white" : ""
                      }`}
                      style={{
                        wordBreak: "break-word",
                        // overflowWrap: "break-word",
                      }}
                    >
                      {renderClickableText(msg.text, isSentByCurrentUser)}
                    </p>
                  )}
                </div>
              </div>
              {isSentByCurrentUser && (
                <span className="text-sm self-end ml-1 flex-shrink-0">
                  {msg.seen ? (
                    <BsCheck2All size={16} className="text-primary" />
                  ) : (
                    <BsCheck2 size={16} className="text-gray-500" />
                  )}
                </span>
              )}
            </div>
            {/* Grouped Reactions Display */}
            {hasAnyReactions && (
              <div
                className={`flex gap-1 flex-wrap items-center pt-0.5 rounded-full mr-5 text-xs font-semibold
                ${isSentByCurrentUser ? "justify-end" : "justify-start"}
                relative`}
              >
                {isSentByCurrentUser && (
                  <button
                    ref={addReactionButtonRef}
                    onClick={(e) => handleOpenEmojiPickerPopover(e, addReactionButtonRef)}
                    className="text-gray-400 hover:text-gray-200 size-[30px] rounded-lg flex items-center justify-center transition-colors duration-200 ease-in-out hover:bg-gray-700 bg-gray-800"
                    style={messageContentStyle}
                    title="Add reaction"
                  >
                    <PiSmileyFill className="size-5" />
                  </button>
                )}

                {Object.entries(groupedReactions).map(([emoji, data]) => {
                  const hasCurrentUserReactedToThisEmoji = data.userIds.some(
                    (userId) => userId === currentUser._id?.toString()
                  );

                  return (
                    <div
                      key={emoji}
                      style={messageContentStyle}
                      className={`flex items-center cursor-pointer text-md rounded-lg px-1.5 py-1.5 ${
                        hasCurrentUserReactedToThisEmoji
                          ? "bg-violet-600/30 border-violet-600 border"
                          : "bg-gray-800 border border-gray-800"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReactionClick(msg._id, emoji);
                      }}
                    >
                      <span className="text-[16px]">{emoji}</span>
                      <span className="ml-1 font-bold">{data.count}</span>
                    </div>
                  );
                })}

                {!isSentByCurrentUser && (
                  <button
                    ref={addReactionButtonRef}
                    onClick={(e) => handleOpenEmojiPickerPopover(e, addReactionButtonRef)}
                    className="text-gray-400 hover:text-gray-200 size-[30px] rounded-lg flex items-center justify-center transition-colors duration-200 ease-in-out border border-transparent hover:bg-gray-700 bg-gray-800"
                    style={messageContentStyle}
                    title="Add reaction"
                  >
                    <PiSmileyFill className="size-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Emoji Picker Popover */}
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
    </>
  );
};

export default React.memo(MessageItem);
