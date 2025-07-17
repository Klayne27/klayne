import React from "react";
import { FaCircle, FaReply } from "react-icons/fa";
import { FiTrash } from "react-icons/fi";
import { BsCheck2, BsCheck2All } from "react-icons/bs";
import { MdEdit } from "react-icons/md"; // Import the edit icon

import { truncateText } from "../../../utils/truncateText";
import { renderClickableText } from "../../../utils/textUtils";

const MessageItem = ({
  msg,
  isCurrentlyTouchDevice,
  activeMessageModalId,
  handleMouseEnter,
  handleMouseLeave,
  handleMessageTap,
  handleDeleteClick,
  handleReplyClick,
  handleImageClick,
  handleJumpToOriginalMessage,
  handleReactionClick,
  isDeletingMessage,
  currentUser,
  setEditingMessage,
  isTypingOtherUser,
}) => {
  // --- NEW: Typing Indicator MessageItem ---
  if (isTypingOtherUser) {
    return (
      <div className="flex justify-start p-1 rounded-lg message-item-container">
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
  const allowedEmojis = ["❤️", "👍", "😂", "😭", "😡"];

  const messageHighlightClass = isCurrentlyTouchDevice
    ? showModal
      ? "active-highlight"
      : ""
    : "hover:bg-secondary";

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

  const handleEditClick = (e) => {
    e.stopPropagation(); // Prevent the message tap/hover logic
    setEditingMessage(msg); // Set the current message as the one to be edited
    // You might also want to close the modal after setting the message for editing
    handleMessageTap(null); // Passing null will close any active modal
  };

  return (
    <div
      key={msg._id}
      id={`message-${msg._id}`}
      className={`p-1 rounded-lg relative message-item-container ${messageHighlightClass}`}
      onMouseEnter={() => handleMouseEnter(msg._id)}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => {
        const modalElement = document.getElementById(`message-modal-${msg._id}`);
        if (modalElement && modalElement.contains(e.target)) {
          return;
        }
        handleMessageTap(msg._id);
      }}
    >
      <div
        className={`flex ${
          isSentByCurrentUser ? "justify-self-end" : "justify-self-start"
        }`}
      >
        {msg.isEdited &&
          msg.text && ( // Only show if it's a text message and it's marked as edited
            <span className="text-xs italic text-gray-500 mb-1 mr-7 ml-2">(Edited)</span>
          )}
      </div>
      <div
        id={`message-modal-${msg._id}`}
        className={`absolute -top-5 bg-secondary shadow-sm shadow-primary rounded-xl px-2 flex items-center gap-1 transition-opacity z-10
                ${
                  isSentByCurrentUser
                    ? "-left-28 translate-x-1/2"
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
            }}
            className={`text-xl hover:scale-125 py-1 transition duration-100`}
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleReplyClick(msg);
          }}
          className="text-primary/90 hover:text-primary hover:scale-125 rounded-full p-1 ml-1"
          title="Reply"
        >
          <FaReply size={18} />
        </button>

        {/* NEW: Edit Button */}
        {isEditable && ( // Only show if the message is editable
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
                conversationId: msg.conversationId, // <-- Pass conversationId here
              });
            }}
            className={`text-red-400 hover:text-red-500 hover:scale-125 rounded-full p-1 cursor-pointer`}
            title="Delete message"
            // disabled={isDeletingMessage}
          >
            <FiTrash size={18} />
          </button>
        )}
      </div>
      <div
        className={`flex whitespace-pre-wrap ${
          isSentByCurrentUser ? "justify-end" : "justify-start"
        } items-start group relative`}
      >
        <div
          className={`flex flex-col max-w-[70%] p-3 rounded-3xl relative
                ${
                  isSentByCurrentUser
                    ? "bg-primary text-white rounded-br-[4px]"
                    : "bg-[#2F3336] text-white rounded-bl-[4px]"
                }`}
        >
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
                  alt="replied message attachment"
                  className="mt-1 rounded-md max-w-[100px] max-h-[100px] object-cover"
                />
              )}
            </div>
          )}
          {msg.img && (
            <img
              src={msg.img}
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
          {/* "Edited" indicator display */}
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
      {Object.keys(groupedReactions || {}).length > 0 && (
        <div
          className={`flex gap-1 -bottom-3 items-center py-1 rounded-full text-xs font-semibold
                                ${
                                  isSentByCurrentUser
                                    ? "justify-self-end"
                                    : "justify-self-start"
                                }
                                `}
        >
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
                  data.users.length > 0 ? `Reacted by: ${data.users.join(", ")}` : ""
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
        </div>
      )}

      <span
        className={`text-xs mt-1 flex text-gray-500 ${
          isSentByCurrentUser ? "justify-self-end" : "self-start"
        }`}
      >
        {new Date(msg.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </span>
    </div>
  );
};

export default React.memo(MessageItem);
