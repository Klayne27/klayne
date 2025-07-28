import React, { useState } from "react"; // Import useState
import { FaCircle, FaReply } from "react-icons/fa";
import { FiTrash } from "react-icons/fi";
import { BsCheck2, BsCheck2All } from "react-icons/bs";
import { MdEdit } from "react-icons/md"; // Import the edit icon

import { truncateText } from "../../../utils/truncateText";
import { renderClickableText } from "../../../utils/textUtils";
import { useNavigate } from "react-router-dom";
import { PiSmileyFill } from "react-icons/pi";
import { useRef } from "react";
import { useCallback } from "react";
import EmojiPickerPopover from "../EmojiPickerPopover";

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
  showHeaderInfo,
  senderProfileImg,
  senderUsername,
  isFirstInGroup,
  isLastInGroup,
  handleLoadImage,
  onOpenFullEmojiPicker,
}) => {
  const navigate = useNavigate();

  // --- NEW: State for hover effect ---
  const [isHovered, setIsHovered] = useState(false);

  const [showEmojiPickerPopover, setShowEmojiPickerPopover] = useState(false);
  // State for the popover's calculated position
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  // Ref for the "More Emojis" button, which will be the popover's anchor
  const moreEmojisButtonRef = useRef(null);
  // NEW: Ref for the "Add Reaction" button beside grouped reactions
  const addReactionButtonRef = useRef(null);

  // Callback to open the popover and calculate its position
  const handleOpenEmojiPickerPopover = useCallback(
    (e) => {
      e.stopPropagation();

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

      // Adjust newLeft to prevent going off the left edge
      if (newLeft - estimatedPickerWidth / 2 < padding) {
        newLeft = estimatedPickerWidth / 2 + padding;
      }

      // Adjust newLeft to prevent going off the right edge
      if (newLeft + estimatedPickerWidth / 2 > window.innerWidth - padding) {
        newLeft = window.innerWidth - estimatedPickerWidth / 2 - padding;
      }

      // Adjust newTop to prevent going off the top edge
      if (newTop < padding) {
        // Use padding instead of 0
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

  // Callback to close the popover
  const handleCloseEmojiPickerPopover = useCallback(() => {
    setShowEmojiPickerPopover(false);
  }, []);

  // Callback for when an emoji is selected from the picker
  const handleEmojiSelect = useCallback(
    (emojiObject) => {
      handleReactionClick(msg._id, emojiObject.emoji); // Use emojiObject.emoji
      handleCloseEmojiPickerPopover(); // Close the popover after selection
      onReactionAdded();
    },
    [handleReactionClick, msg._id, handleCloseEmojiPickerPopover, onReactionAdded]
  );

  const hasCurrentUserReactedToMessage = msg.reactions?.some(
    (reaction) =>
      (reaction.user?._id?.toString() || reaction.user?.toString()) ===
      currentUser._id.toString()
  );


  // --- NEW: Typing Indicator MessageItem ---
  if (isTypingOtherUser) {
    return (
      <div className="flex justify-start p-1 rounded-lg message-item-container ml-9">
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

  const isSentByCurrentUser =
    (typeof msg.sender === "object" && msg.sender?._id === currentUser._id) ||
    (typeof msg.sender === "string" && msg.sender === currentUser._id);
  // Ensure message has text content to be editable (images typically aren't edited this way)
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


  const handleEditClick = (e) => {
    e.stopPropagation(); // Prevent the message tap/hover logic
    setEditingMessage(msg); // Set the current message as the one to be edited
    // You might also want to close the modal after setting the message for editing
    handleMessageTap(null); // Passing null will close any active modal
    setReplyingToMessage(null);
  };

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
  // Determine message bubble corner classes
  let bubbleClasses = "";
  if (isSentByCurrentUser) {
    bubbleClasses += " bg-primary text-white";
    if (isFirstInGroup && isLastInGroup) {
      bubbleClasses += " rounded-3xl"; // Single message, or isolated message
    } else if (isFirstInGroup) {
      bubbleClasses += " rounded-tl-3xl rounded-bl-3xl rounded-tr-3xl rounded-br-[4px]"; // First in group
    } else if (isLastInGroup) {
      bubbleClasses += " rounded-tl-3xl rounded-bl-3xl rounded-tr-[4px] rounded-br-3xl"; // Last in group
    } else {
      bubbleClasses += " rounded-tl-3xl rounded-bl-3xl rounded-tr-[4px] rounded-br-[4px]"; // Middle message
    }
  } else {
    // Not current user
    bubbleClasses += " bg-[#2F3336] text-white";
    if (isFirstInGroup && isLastInGroup) {
      bubbleClasses += " rounded-3xl"; // Single message, or isolated message
    } else if (isFirstInGroup) {
      bubbleClasses += " rounded-tr-3xl rounded-br-3xl rounded-tl-3xl rounded-bl-[4px]"; // First in group
    } else if (isLastInGroup) {
      bubbleClasses += " rounded-tr-3xl rounded-br-3xl rounded-tl-[4px] rounded-bl-3xl"; // Last in group
    } else {
      bubbleClasses += " rounded-tr-3xl rounded-br-3xl rounded-tl-[4px] rounded-bl-[4px]"; // Middle message
    }
  }

  // Determine if the time should be shown
  const shouldShowTimeOnHover = isHovered || showModal;

  return (
    <div
      // key={`message-${msg._id}-key`}
      id={`message-${msg._id}`}
      className={`rounded-lg py-[1px] relative message-item-container hover:bg-secondary ${
        showHeaderInfo ? "mt-4" : "" // Adjust margin for visual grouping
      }`}
      onMouseEnter={() => {
        handleMouseEnter(msg._id);
        setIsHovered(true); // Set hover state to true
      }}
      onMouseLeave={() => {
        handleMouseLeave();
        setIsHovered(false); // Set hover state to false
      }}
      onClick={(e) => {
        const modalElement = document.getElementById(`message-modal-${msg._id}`);
        if (modalElement && modalElement.contains(e.target)) {
          return;
        }
        handleMessageTap(msg._id);
      }}
    >
      <div
        id={`message-modal-${msg._id}`}
        className={`absolute -top-5 bg-secondary shadow-sm shadow-primary rounded-xl px-2 flex items-center gap-1 z-10
          ${
            isSentByCurrentUser
              ? "-left-28 translate-x-1/2"
              : "-right-20 -translate-x-1/2"
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
            className={`text-xl md:hover:scale-125 py-1 transition duration-100`}
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
        <div className="w-px h-6 bg-slate-500 mx-1"></div> {/* Added divider */}
        <button
          ref={moreEmojisButtonRef} // Attach ref to this button
          onClick={handleOpenEmojiPickerPopover} // Toggle popover on click
          className="text-amber-400 hover:text-amber-500 md:hover:scale-125 duration-100 transtion border-slate-500 mt-[1px]"
          title="More Emojis"
        >
          <PiSmileyFill className="size-[26px]" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleReplyClick(msg);
            setEditingMessage(null);
          }}
          className="text-blue-400 hover:text-blue-500 hover:scale-125 rounded-full p-1"
          title="Reply"
        >
          <FaReply size={18} />
        </button>
        {isEditable && (
          <button
            onClick={handleEditClick}
            className="text-yellow-400 hover:text-yellow-500 hover:scale-125 rounded-full p-1"
            title="Edit message"
          >
            <MdEdit size={20} />
          </button>
        )}
        {isSentByCurrentUser && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick({
                messageId: msg._id,
                conversationId: msg.conversationId,
              });
            }}
            className={`text-red-400 hover:text-red-500 hover:scale-125 rounded-full p-1 cursor-pointer`}
            title="Delete message"
          >
            <FiTrash size={18} />
          </button>
        )}
      </div>

      {/* Header Info (Profile Img and Date for other users, only Date for current user) */}
      {showHeaderInfo && !isSentByCurrentUser && (
        <div className="flex items-center gap-2 mb-0.5">
          {/* Removed senderUsername display */}
          <span className="text-xs text-gray-500 ml-10">
            {formatDate(msg.createdAt)} at {formatTime(msg.createdAt)}
          </span>
        </div>
      )}
      {showHeaderInfo && isSentByCurrentUser && (
        <div className="flex justify-end items-center gap-2 mb-0.5 mr-5">
          <span className="text-xs text-gray-500">
            {formatDate(msg.createdAt)} at {formatTime(msg.createdAt)}
          </span>
        </div>
      )}
      {msg.isEdited && msg.text && !isSentByCurrentUser && (
        <div className="flex">
          <span className={`text-xs italic text-gray-500 ml-10`}>(Edited)</span>
        </div>
      )}

      {msg.isEdited && msg.text && isSentByCurrentUser && (
        <div className="flex justify-self-end">
          <span className={`text-xs italic text-gray-500 mr-5`}>(Edited)</span>
        </div>
      )}
      <div
        className={`flex whitespace-pre-wrap ${
          isSentByCurrentUser ? "justify-end" : "justify-start"
        } items-start group relative`}
      >
        {!isSentByCurrentUser && isFirstInGroup && senderProfileImg && (
          <img
            src={senderProfileImg}
            onLoad={handleLoadImage}
            alt={`${senderUsername}'s profile`}
            className="size-8 rounded-full object-cover mr-2 mt-0.5 cursor-pointer"
            onClick={() => navigate(`/profile/${senderUsername}`)}
          />
        )}

        {!isSentByCurrentUser && !isFirstInGroup && <div className="w-8 h-8 mr-2"></div>}

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
        <div className={`flex flex-col max-w-[70%] p-3 relative ${bubbleClasses}`}>
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
                  {renderClickableText(truncateText(msg.repliedTo.text, 50))}
                </span>
              )}
              {msg.repliedTo.img && (
                <img
                  src={msg.repliedTo.img}
                  onLoad={handleLoadImage}
                  alt="replied message attachment"
                  className="mt-1 rounded-md max-w-[100px] max-h-[100px] object-cover"
                />
              )}
            </div>
          )}
          {msg.img && (
            <img
              src={msg.img}
              onLoad={handleLoadImage}
              alt="message attachment"
              className="mt-2 rounded-lg w-60 h-auto object-cover cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleImageClick(msg.img, e);
              }}
            />
          )}
          {msg.text && (
            <p
              className={`break-words text-sm ${isSentByCurrentUser ? "text-white" : ""}`}
            >
              {renderClickableText(msg.text, isSentByCurrentUser)}
            </p>
          )}
        </div>
        {isSentByCurrentUser && msg.seen && (
          <span className={`self-end ml-1 text-primary`}>
            <BsCheck2All size={16} />
          </span>
        )}
        {isSentByCurrentUser && !msg.seen && (
          <span className={`self-end ml-1 text-gray-500`}>
            <BsCheck2 size={16} />
          </span>
        )}
      </div>
      {/* Grouped Reactions and NEW Add Reaction Button */}
      {/* Grouped Reactions and NEW Add Reaction Button */}
      {hasAnyReactions && ( // Only show this entire block if there's at least one reaction
        <div
          className={`flex gap-1 flex-wrap items-center pt-0.5 rounded-full text-xs font-semibold
                      ${
                        isSentByCurrentUser
                          ? "justify-end mr-5" // Align to the right
                          : "justify-start ml-10" // Align to the left
                      }
                      relative`}
        >
          {/* Render "Add Reaction" button BEFORE reactions if sent by current user */}
          {hasAnyReactions && isSentByCurrentUser && (
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
              (userId) => userId === currentUser._id?.toString()
            );

            return (
              <div
                key={emoji}
                className={`flex items-center cursor-pointer text-md rounded-lg px-1.5 py-1.5 ${
                  hasCurrentUserReactedToThisEmoji
                    ? "bg-violet-600/30 border-violet-600 border"
                    : "bg-gray-800 border border-gray-800"
                }`}
                title={
                  data.userIds.length > 0
                    ? `Reacted by: ${data.userIds
                        .map((id) => `User ID: ${id}`)
                        .join(", ")}`
                    : ""
                }
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

          {/* Render "Add Reaction" button AFTER reactions if sent by other user */}
          {hasAnyReactions && !isSentByCurrentUser && (
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
          onEmojiClick={handleEmojiSelect} // Pass the handler for emoji selection
          triggerRef={
            addReactionButtonRef.current && showEmojiPickerPopover
              ? addReactionButtonRef
              : moreEmojisButtonRef
          }
        />
      )}
    </div>
  );
};

export default React.memo(MessageItem);
