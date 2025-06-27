import React, { useCallback, forwardRef, useState } from "react";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { truncateText } from "../../utils/truncateText";
import { FaReply } from "react-icons/fa";
import { FiTrash } from "react-icons/fi";
import { renderClickableText } from "../../utils/textUtils";
import { BsCheck2All } from "react-icons/bs";
import LoadingSpinner from "./LoadingSpinner";
import { useReactToMessage } from "../../hooks/messagesHooks/useReactToMessage";

// New Icon for adding reactions
import { MdOutlineAddReaction } from "react-icons/md";

const MessageList = forwardRef(function MessageList(
  {
    error,
    isNewChat,
    messagesToRender,
    setReplyingToMessage,
    deleteMessage,
    messageInputRef,
    isDeletingMessage,
    selectedConversation,
    openImageModal,
    isLoadingInitialMessages,
    isFetchingOlderMessages,
    hasNextPage,
  },
  ref
) {
  const { authUser: currentUser } = useAuthUser();

  const { mutate: reactToMessage, isLoading: isReacting } = useReactToMessage();

  const allowedEmojis = ["❤️", "👍", "😂", "😭", "😡"];

  const handleDeleteClick = useCallback(
    (messageId) => {
      deleteMessage(messageId);
    },
    [deleteMessage]
  );

  const handleReplyClick = useCallback(
    (message) => {
      setReplyingToMessage(message);
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    },
    [setReplyingToMessage, messageInputRef]
  );

  const handleImageClick = (imageUrl, event) => {
    event.stopPropagation();
    if (openImageModal) {
      openImageModal(imageUrl);
    } else {
      console.warn(
        "openImageModal prop is undefined in Message component. Image modal will not open."
      );
    }
  };

  const handleJumpToOriginalMessage = useCallback((originalMessageId) => {
    const originalMessageElement = document.getElementById(
      `message-${originalMessageId}`
    );
    if (originalMessageElement) {
      originalMessageElement.scrollIntoView({
        behavior: "instant",
        block: "center",
      });
      originalMessageElement.classList.add("highlight-message");
      setTimeout(() => {
        originalMessageElement.classList.remove("highlight-message");
      }, 1500);
    }
  }, []);

  const handleReactionClick = useCallback(
    (messageId, emoji) => {
      reactToMessage({ messageId, emoji });
    },
    [reactToMessage]
  );

  return (
    <div
      ref={ref}
      className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar pt-20"
    >
      {isLoadingInitialMessages && (
        <div className="flex justify-center items-center h-full">
          <LoadingSpinner size="md" />
        </div>
      )}
      {error && !isNewChat && !isLoadingInitialMessages && (
        <div className="flex justify-center items-center h-full text-red-500">
          <p>Error loading messages: {error.message}</p>
        </div>
      )}
      {isFetchingOlderMessages && (
        <div className="flex justify-center py-2">
          <LoadingSpinner size="sm" />
        </div>
      )}
      {!hasNextPage &&
        !isLoadingInitialMessages &&
        !isFetchingOlderMessages &&
        messagesToRender.length > 0 && (
          <div className="flex justify-center text-gray-500 text-sm my-2">
            <p>No more messages</p>
          </div>
        )}
      {!isNewChat &&
        messagesToRender.length > 0 &&
        messagesToRender.map((msg) => {
          const isSentByCurrentUser = msg.sender._id === currentUser._id;
          const groupedReactions = msg.reactions?.reduce((acc, reaction) => {
            acc[reaction.emoji] = acc[reaction.emoji] || {
              count: 0,
              users: [],
              userIds: [],
            };
            acc[reaction.emoji].count++;

            // Ensure we get the user ID for comparison
            const reactorId = reaction.user?._id?.toString() || reaction.user?.toString();
            if (reactorId) {
              acc[reaction.emoji].userIds.push(reactorId);
            }

            // Ensure we get the username for the tooltip
            const reactorName = reaction.user?.username || reactorId || "Unknown User";
            acc[reaction.emoji].users.push(reactorName);

            return acc;
          }, {});
          return (
            <div
              key={msg._id}
              id={`message-${msg._id}`}
              className="hover:bg-gray-900 p-1 rounded-lg group relative"
            >
              <div
                className={`absolute -top-5 bg-gray-800 shadow-xl rounded-xl px-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10
                    ${
                      isSentByCurrentUser
                        ? "-left-28 translate-x-1/2" // Adjust position for sender's messages
                        : "-right-24 -translate-x-1/2" // Adjust position for receiver's messages
                    }
                  `}
              >
                {/* Reaction Emojis */}
                {allowedEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReactionClick(msg._id, emoji)}
                    className={`text-xl hover:scale-125 py-1  transition duration-100`}
                    disabled={isReacting}
                    title={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}

                <button
                  onClick={() => handleReplyClick(msg)}
                  className="text-gray-300 hover:text-white hover:scale-125 rounded-full p-1 ml-1"
                  title="Reply"
                >
                  <FaReply size={18} />
                </button>

                {/* Delete Button (only for current user's messages) */}
                {isSentByCurrentUser && (
                  <button
                    onClick={() => handleDeleteClick(msg._id)}
                    className={`text-red-400 hover:text-red-500 hover:scale-125 rounded-full p-1 ${
                      isDeletingMessage ? "cursor-not-allowed" : "cursor-pointer"
                    }`}
                    title="Delete message"
                    disabled={isDeletingMessage}
                  >
                    {isDeletingMessage ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <FiTrash size={18} />
                    )}
                  </button>
                )}
              </div>
              <div
                className={`flex ${
                  isSentByCurrentUser ? "justify-end" : "justify-start"
                } items-start group relative`}
              >
                {/* Message Bubble Content */}
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
                      onClick={() => handleJumpToOriginalMessage(msg.repliedTo._id)}
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
                          className={`font-bold ${
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
                      onClick={(e) => handleImageClick(msg.img, e)}
                    />
                  )}
                  {msg.text && (
                    <p className={`break-words text-sm `}>
                      {renderClickableText(msg.text, isSentByCurrentUser)}
                    </p>
                  )}
                </div>
                {isSentByCurrentUser && msg.seen && (
                  <span className={`self-end ml-1`}>
                    <BsCheck2All size={16} />
                  </span>
                )}
              </div>
              {/* Display Reactions */}
              {Object.keys(groupedReactions || {}).length > 0 && (
                <div
                  className={`flex gap-1 -bottom-3 items-center py-1 rounded-full text-xs font-semibold
                       ${isSentByCurrentUser ? "justify-self-end" : "justify-self-start"}
                      `}
                >
                  {Object.entries(groupedReactions).map(([emoji, data]) => {
                    const hasCurrentUserReactedToThisEmoji = data.userIds.some(
                      (userId) => userId === currentUser._id?.toString()
                    );

                    return (
                      <div
                        key={emoji}
                        className={`flex items-center cursor-pointer text-md rounded-lg  px-1.5 py-1.5 ${
                          hasCurrentUserReactedToThisEmoji
                            ? "bg-primary/30 border-primary border"
                            : "bg-gray-800 border border-gray-800"
                        }`}
                        // You can add a tooltip here to show user names
                        title={
                          data.users.length > 0
                            ? `Reacted by: ${data.users.join(", ")}`
                            : ""
                        }
                        onClick={() => handleReactionClick(msg._id, emoji)}
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
        })}
    </div>
  );
});

export default React.memo(MessageList);
