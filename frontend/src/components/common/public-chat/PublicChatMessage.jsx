import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { MdAdminPanelSettings, MdDeleteForever } from "react-icons/md";
import { FaUserSlash, FaUserCheck, FaBan } from "react-icons/fa";
import { FiTrash } from "react-icons/fi";
import { MdEdit } from "react-icons/md";
import { PiSmileyFill } from "react-icons/pi";
import { BsThreeDots } from "react-icons/bs";

import EmojiPickerPopover from "../EmojiPickerPopover";
import { HiOutlineReply } from "react-icons/hi";
import { IoCopy } from "react-icons/io5";
import { useDeleteOwnPublicMessage } from "../../../hooks/publicChatHooks/useDeleteOwnPublicMessage";
import { useDeletePublicMessage } from "../../../hooks/publicChatHooks/useDeletePublicMessage";
import { useAppStore } from "../../../store/appStore";
import { formatDate, formatTime } from "../../../utils/date";
import { useEmojiPickerPopover } from "../../../hooks/useEmojiPickerPopover";
import { useBanUserFromPublicChat } from "../../../hooks/publicChatHooks/useBanUserFromPublicChat";
import { useUnbanUserFromPublicChat } from "../../../hooks/publicChatHooks/useUnbanUserFromPublicChat";
import { usePublicChatStore } from "../../../store/usePublicChatStore";
import { useAddPublicMessageReaction } from "../../../hooks/publicChatHooks/useAddPublicMessageReaction";
import { getMessageBubbleClasses } from "../../../utils/getMessageBubbleClasses";
import { useIsMobile } from "../../../hooks/useIsMobile";
import DateSeparator from "../../ui/DateSeperator";
import MessageReactions from "../../ui/MessageReactions";
import MessageBubble from "../../ui/MessageBubble";
import MessageContentLayout from "../../ui/MessageContentLayout";
import { useOpenMoreActionsModal } from "../../../hooks/useOpenMoreActionsModal";
import MessageActionsModal from "../../ui/MessageActionsModal";

// --- PublicChatMessage Component ---
const PublicChatMessage = React.memo(function PublicChatMessage({
  message,
  currentUser,
  publicChatInputRef,
  // onBan,
  // onUnban,
  // isCurrentlyTouchDevice,
  // activeMessageModalId,
  // handleMouseEnter,
  // handleMouseLeave,
  // handleMessageTap,
  // handleReactionClick,
  // onReply,
  // onEdit,
  // onJumpToMessage,
  // setEditingMessage,
  // setReplyingToMessage,
  handleLoadImage,
  // message.isFirstInGroup,
  // message.isLastInGroup,
  onReactionAdded,
  // message.isNewDay, // NEW PROP
}) {
  const {
    replyingToMessage,
    setReplyingToMessage,
    editingMessage,
    setEditingMessage,
    activeMessageModalId,
    setActiveMessageModalId,
    isCurrentlyTouchDevice,
    setIsCurrentlyTouchDevice,
    showNewMessageButton,
    setShowNewMessageButton,
  } = usePublicChatStore();
  const openImageModal = useAppStore((state) => state.openImageModal);
  const { deleteOwnMessage, isDeletingOwnMessage } = useDeleteOwnPublicMessage();
  const { adminDeletePublicMessage, isPending: isAdminDeleting } =
    useDeletePublicMessage();
  const [isHovered, setIsHovered] = useState(false);

  // const [showEmojiPickerPopover, setShowEmojiPickerPopover] = useState(false);
  // const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const moreEmojisButtonRef = useRef(null);
  const addReactionButtonRef = useRef(null);
  const moreActionsButtonRef = useRef(null); // Ref for the new More Actions button

  // const [showMoreActionsModal, setShowMoreActionsModal] = useState(false); // State for the new modal
  // const [moreActionsModalPosition, setMoreActionsModalPosition] = useState({
  //   top: 0,
  //   left: 0,
  // });

  const pressTimer = useRef(null);
  const LONG_PRESS_DURATION = 500; // milliseconds

  const { banUser } = useBanUserFromPublicChat();
  const { unbanUser } = useUnbanUserFromPublicChat();
  const { addReaction } = useAddPublicMessageReaction();

  const isMobile = useIsMobile();
  // --- Handlers for More Actions Modal ---

  const isSentByCurrentUser = message.sender?._id === currentUser?._id;

  const isEditable =
    isSentByCurrentUser && !message.isDeletedByAdmin && !message.isDeletedByUser;

  const {
    showEmojiPickerPopover,
    setShowEmojiPickerPopover,
    popoverPosition,
    handleOpenEmojiPickerPopover,
    handleCloseEmojiPickerPopover,
  } = useEmojiPickerPopover();

  const {
    moreActionsModalPosition,
    handleOpenMoreActionsModal,
    setShowMoreActionsModal,
    showMoreActionsModal,
  } = useOpenMoreActionsModal({ setShowEmojiPickerPopover, isEditable });

  const isSenderAdmin = message.sender.isAdmin;
  const isAuthUserAdmin = currentUser.isAdmin;
  const isSenderBanned = message.sender.isBannedInPublicChat;
  const isMessageDeleted = message.isDeletedByAdmin || message.isDeletedByUser;
  const isReplyToMessageDeleted =
    message.repliedTo?.isDeletedByAdmin || message.repliedTo?.isDeletedByUser;
  const isSenderVerified = message.sender.isVerified;
  const isSenderGoldVerified = message.sender.isGoldVerified;
  const isMessageEdited = message.isEdited;

  const showModal = activeMessageModalId === message._id;
  const allowedEmojis = ["❤️", "👍", "😂"];

  const shouldShowTimeOnHover = isHovered || showModal;
  const isMessageHighlighted = isHovered || showModal;

  // const handleOpenMoreActionsModal = useCallback(
  //   (e) => {
  //     e.stopPropagation();
  //     setShowEmojiPickerPopover(false); // Close emoji picker if open
  //     if (showMoreActionsModal) {
  //       setShowMoreActionsModal(false);
  //       return;
  //     }

  //     const buttonRect = e.currentTarget.getBoundingClientRect();
  //     // Estimate modal height based on actions available
  //     // Reply, Edit (optional), Delete (optional), Admin Ban/Unban (optional)

  //     let numItems = 1; // Always has Reply
  //     if (isEditable) numItems += 1; // Add Edit
  //     if (canDeleteOwn || canAdminActions) numItems += 1; // Add Delete (own) or Admin actions

  //     const itemHeight = 45; // px per action item (approximate, including padding)
  //     const estimatedModalHeight = numItems * itemHeight + 10; // Add some vertical padding for the modal itself

  //     const modalWidth = 180; // Approximate width of the modal

  //     // Calculate newLeft to position the modal to the left of the button.
  //     const offsetLeft = 5; // Small offset for visual spacing
  //     let newLeft = buttonRect.left - modalWidth - offsetLeft;

  //     // Ensure the modal doesn't go off the left edge of the screen
  //     if (newLeft < 10) {
  //       newLeft = 10; // Minimum 10px padding from the left edge
  //     }

  //     // Calculate newTop to align the vertical middle of the modal with the vertical middle of the button.
  //     let newTop = buttonRect.top + buttonRect.height / 2 - estimatedModalHeight / 2;

  //     // Ensure the modal doesn't go off the top or bottom edge of the screen
  //     const paddingVertical = 10; // Minimum padding from top/bottom viewport edge
  //     if (newTop < paddingVertical) {
  //       newTop = paddingVertical;
  //     }
  //     if (newTop + estimatedModalHeight > window.innerHeight - paddingVertical) {
  //       newTop = window.innerHeight - estimatedModalHeight - paddingVertical;
  //     }

  //     setMoreActionsModalPosition({ top: newTop, left: newLeft });
  //     setShowMoreActionsModal(true);
  //   },
  //   [
  //     showMoreActionsModal,
  //     isSentByCurrentUser,
  //     message.isDeletedByAdmin,
  //     message.isDeletedByUser,
  //     currentUser.isAdmin,
  //     setShowEmojiPickerPopover,
  //   ]
  // );

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

  const bubbleClasses = getMessageBubbleClasses(message, isSentByCurrentUser);

  const handleReactionClick = (messageId, emoji) => {
    addReaction({ messageId, emoji }); // `addReaction` should be memoized or from a stable hook
    setActiveMessageModalId(null);
  };

  const handleEmojiSelect = (emojiObject) => {
    handleReactionClick(message._id, emojiObject.emoji);
    handleCloseEmojiPickerPopover();
    onReactionAdded();
  };

  const openEmojiPickerWithModalClose = (e) => {
    handleOpenEmojiPickerPopover(e, setShowMoreActionsModal);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.text);
    handleMessageTap(null); // Close main reaction modal
    setShowMoreActionsModal(false); // Close this modal
  };

  // --- Message hover/tap handlers (now update Zustand state) ---
  const handleMouseEnter = (messageId) => {
    if (!isCurrentlyTouchDevice) {
      setActiveMessageModalId(messageId);
    }
  };

  const handleMouseLeave = () => {
    if (!isCurrentlyTouchDevice) {
      setActiveMessageModalId(null);
    }
  };

  const handleMessageTap = (messageId) => {
    if (isCurrentlyTouchDevice) {
      setActiveMessageModalId(activeMessageModalId === messageId ? null : messageId);
    }
  };

  const handleJumpToMessage = (messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      messageElement.classList.add("highlight-message");

      setTimeout(() => {
        messageElement.classList.remove("highlight-message");
      }, 1500);
    }
  };

  // NEW: Mobile Touch Handlers
  const handleTouchStart = (e) => {
    e.stopPropagation();
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

  const handleEditClick = () => {
    publicChatInputRef.current.focus();
    setEditingMessage(message);
    handleMessageTap(null); // Close main reaction modal
    setShowMoreActionsModal(false);
  };

  const handleReplyClick = () => {
    publicChatInputRef.current.focus();
    setReplyingToMessage(message);
    handleMessageTap(null); // Close main reaction modal
    setShowMoreActionsModal(false);
  };

  const handleReplyingToClick = (e) => {
    e.stopPropagation();
    if (message.repliedTo && message.repliedTo._id) {
      handleJumpToMessage(message.repliedTo._id);
    }
  };

  const handleImageClick = (imageUrl) => {
    openImageModal(imageUrl);
  };

  const handleAdminDeleteMessage = () => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      adminDeletePublicMessage(message._id);
    }
  };

  const handleBanUser = () => {
    if (window.confirm(`Are you sure you want to ban this user from public chat?`)) {
      banUser(message.sender._id);
    }
  };

  const handleUnbanUser = () => {
    if (window.confirm(`Are you sure you want to unban this user from public chat?`)) {
      unbanUser(message.sender._id);
    }
  };

  const handleDeleteOwnMessage = () => {
    deleteOwnMessage(message._id);
  };

  const handleCloseMoreActionsModal = useCallback(() => {
    setShowMoreActionsModal(false);
  }, [setShowMoreActionsModal]);

  return (
    <>
      {message.isNewDay && <DateSeparator date={message.createdAt} />}

      <div
        key={message._id}
        id={`message-${message._id}`}
        className={`relative mb-0 p-[1px] rounded-lg ${
          isMessageHighlighted ? "bg-secondary" : ""
        } ${isSentByCurrentUser ? "justify-end" : "justify-start"} ${
          message.isFirstInGroup ? "mt-4" : ""
        }`}
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
          if (isMobile) {
            if (showModal) {
              handleMessageTap(null);
            }
            e.stopPropagation();
          } else {
            const modalElement = document.getElementById(`message-modal-${message._id}`);
            if (modalElement && modalElement.contains(e.target)) {
              return;
            }
            handleMessageTap(message._id);
          }
        }}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        onTouchMove={isMobile ? handleTouchMove : undefined}
      >
        {/* Main Reaction Picker and Action Modal */}
        <div
          id={`message-reaction-modal-${message._id}`}
          className={`absolute -top-5 bg-base-100 gray-shadow rounded-xl px-2 flex items-center gap-1 transition-opacity z-10
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
            onClick={(e) => openEmojiPickerWithModalClose(e, moreEmojisButtonRef)}
            className=" text-slate-500 group hover:text-slate-400 hover:bg-secondary rounded-lg duration-100 transtion"
            title="More Emojis"
          >
            <PiSmileyFill size={27} className="group-hover:scale-110 p-[3px]" />
          </button>
          <button
            onClick={handleReplyClick}
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
          // <div
          //   className="fixed inset-0 z-20"
          //   onClick={() => setShowMoreActionsModal(false)}
          // >
          //   <div
          //     className={`absolute bg-base-100 gray-shadow rounded-xl p-2 z-30`}
          //     style={{
          //       top: moreActionsModalPosition.top,
          //       left: moreActionsModalPosition.left,
          //       minWidth: "180px", // Ensure a consistent minimum width
          //     }}
          //     onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
          //   >
          //     <button
          //       onClick={handleReplyClick}
          //       className="flex justify-between rounded-md items-center gap-2 w-full px-3 py-1.5 text-slate-300 hover:bg-secondary transition duration-200"
          //     >
          //       Reply
          //       <HiOutlineReply size={18} className="text-slate-400" />
          //     </button>
          //     {message.text && (
          //       <button
          //         onClick={handleCopyMessage}
          //         className="flex justify-between items-center gap-2 rounded-md w-full px-3 py-1.5 text-slate-300 hover:bg-secondary duration-200 transition"
          //       >
          //         Copy Text
          //         <IoCopy size={18} className="text-slate-400" />
          //       </button>
          //     )}
          //     {isSentByCurrentUser && !isMessageDeleted && (
          //       <button
          //         onClick={handleEditClick}
          //         className="flex justify-between rounded-md items-center gap-2 w-full px-3 py-1.5 text-slate-300 hover:bg-secondary transition duration-200"
          //       >
          //         Edit Message
          //         <MdEdit size={16} className="text-slate-400" />
          //       </button>
          //     )}
          //     {isSentByCurrentUser && !isMessageDeleted && (
          //       <button
          //         onClick={() => handleDeleteOwnMessage(message._id)}
          //         disabled={isDeletingOwnMessage}
          //         className="flex justify-between rounded-md items-center gap-2 w-full px-3 py-1.5 text-red-400 hover:bg-red-400/10 transition duration-200"
          //       >
          //         Delete Message
          //         <FiTrash size={16} />
          //       </button>
          //     )}
          //     {isAuthUserAdmin && !isSentByCurrentUser && (
          //       <>
          //         {!isMessageDeleted && (
          //           <button
          //             onClick={() => handleAdminDeleteMessage(message._id)}
          //             disabled={isAdminDeleting}
          //             className="flex justify-between rounded-md items-center gap-2 w-full px-3 py-1.5 text-red-400 hover:bg-red-400/10 transition duration-200"
          //           >
          //             Delete (Admin)
          //             <MdDeleteForever size={18} />
          //           </button>
          //         )}
          //         {isSenderBanned ? (
          //           <button
          //             onClick={() => handleUnbanUser(message.sender._id)}
          //             className="flex justify-between rounded-md items-center gap-2 w-full px-3 py-1.5 text-green-400 hover:bg-green-400/10 transition duration-200"
          //           >
          //             Unban User
          //             <FaUserCheck size={16} />
          //           </button>
          //         ) : (
          //           <button
          //             onClick={() => handleBanUser(message.sender._id)}
          //             className="flex justify-between rounded-md items-center gap-2 w-full px-3 py-1.5 text-red-400 hover:bg-red-400/10 transition duration-200"
          //           >
          //             Ban User
          //             <FaUserSlash size={16} />
          //           </button>
          //         )}
          //       </>
          //     )}
          //   </div>
          // </div>

          <MessageActionsModal
            onCloseMoreActionsModal={handleCloseMoreActionsModal}
            moreActionsModalPosition={moreActionsModalPosition}
            onReplyClick={handleReplyClick}
            onEditClick={handleEditClick}
            onCopyMessage={handleCopyMessage}
            onDeleteOwnMessage={handleDeleteOwnMessage}
            onAdminDeleteMessage={handleDeleteOwnMessage}
            onBanUser={handleBanUser}
            onUnbanUser={handleUnbanUser}
            message={message}
            isEditable={isEditable}
            isSentByCurrentUser={isSentByCurrentUser}
            isAuthUserAdmin={isAuthUserAdmin}
            isMessageDeleted={isMessageDeleted}
            isSenderBanned={isSenderBanned}
            isAdminDeleting={isAdminDeleting}
          />
        )}

        <MessageContentLayout isSentByCurrentUser={isSentByCurrentUser} message={message}>
          {!isSentByCurrentUser && !message.isFirstInGroup && (
            <div className="w-9 flex-shrink-0" />
          )}

          {shouldShowTimeOnHover && !isSentByCurrentUser && !message.isFirstInGroup && (
            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 mr-2 z-0 whitespace-nowrap">
              {formatTime(message.createdAt)}
            </div>
          )}
          {shouldShowTimeOnHover && isSentByCurrentUser && !message.isFirstInGroup && (
            <div className="absolute -left-[58px] top-1/2 -translate-y-1/2 text-xs text-gray-400 mr-2 z-0 whitespace-nowrap">
              {formatTime(message.createdAt)}
            </div>
          )}
          <div
            className={`flex flex-col ${
              isSentByCurrentUser ? "items-end" : "items-start"
            } w-fit max-w-[75%]`}
          >
            {message.isFirstInGroup && (
              <div className={`flex items-center text-sm mb-0.5`}>
                {!isSentByCurrentUser && (
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
                {isSenderVerified && !isSentByCurrentUser && (
                  <img src="/verified.png" className="size-[17px] mr-1" />
                )}
                {isSenderGoldVerified && !isSentByCurrentUser && (
                  <img src="/gold-verified.png" className="size-[17px] mr-1" />
                )}

                {isSenderAdmin && !isSentByCurrentUser && (
                  <span>
                    <MdAdminPanelSettings size={20} className="mb-[1px] fill-green-500" />
                  </span>
                )}
                {isSenderBanned && !isSentByCurrentUser && (
                  <span>
                    <FaBan size={15} className="fill-red-500 mr-1" />
                  </span>
                )}

                <span className="text-xs text-gray-500">
                  {formatTime(message.createdAt)}
                </span>
              </div>
            )}

            {isMessageEdited && message.text && (
              <span
                className={`text-xs ml-1 italic text-gray-500 ${
                  isSentByCurrentUser ? "self-end mr-1" : "self-start"
                }`}
              >
                (Edited)
              </span>
            )}
            {/* Chat Bubble Container - Now uses the `bubbleClasses` prop */}
            <MessageBubble
              message={message}
              isSentByCurrentUser={isSentByCurrentUser}
              bubbleClasses={bubbleClasses}
              onLoadImage={handleLoadImage}
              onImageClick={handleImageClick}
              messageContentStyle={messageContentStyle}
              isReplyToMessageDeleted={isReplyToMessageDeleted}
              onJumpToOriginalMessage={handleJumpToMessage}
              isMessageDeleted={isMessageDeleted}
              isSenderBanned={isSenderBanned}
            />

            {/* Grouped Reactions Display */}
            {hasAnyReactions && (
              <MessageReactions
                groupedReactions={groupedReactions}
                currentUser={currentUser}
                isSentByCurrentUser={isSentByCurrentUser}
                messageContentStyle={messageContentStyle}
                message={message}
                addReactionButtonRef={addReactionButtonRef}
                openEmojiPickerWithModalClose={openEmojiPickerWithModalClose}
                onReactionClick={handleReactionClick}
              />
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
        </MessageContentLayout>
      </div>
    </>
  );
});

export default PublicChatMessage;
