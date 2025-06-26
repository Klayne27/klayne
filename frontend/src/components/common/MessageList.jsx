import React, { useCallback, useEffect, useRef } from "react";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { truncateText } from "../../utils/truncateText";
import { FaReply } from "react-icons/fa";
import { FiTrash } from "react-icons/fi";
import { renderClickableText } from "../../utils/textUtils";
import { BsCheck2All } from "react-icons/bs";


function MessageList({
  error,
  isNewChat,
  messagesToRender,
  setReplyingToMessage,
  deleteMessage,
  messageInputRef,
  isDeletingMessage,
  selectedConversation,
  messages,
  openImageModal,
}) {
  const { authUser: currentUser } = useAuthUser();
  const messagesEndRef = useRef(null);
  const prevMessagesLength = useRef(0);

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

  useEffect(() => {
    if (messagesEndRef.current && messages) {
      const currentLength = messages.length;
      let scrollBehavior = "auto";

      messagesEndRef.current.scrollIntoView({ behavior: scrollBehavior });
      prevMessagesLength.current = currentLength;
    }
  }, [messages, selectedConversation?._id]);

  useEffect(() => {
    prevMessagesLength.current = 0;
  }, [selectedConversation?._id]);

  // New handler for clicking on the replied-to message div
  const handleJumpToOriginalMessage = useCallback((originalMessageId) => {
    // Find the message element by its ID
    const originalMessageElement = document.getElementById(
      `message-${originalMessageId}`
    );
    if (originalMessageElement) {
      originalMessageElement.scrollIntoView({
        behavior: "smooth", // Smooth scroll
        block: "center", // Align the message in the middle of the view
      });
      // Optional: Add a temporary highlight to the message
      originalMessageElement.classList.add("highlight-message");
      setTimeout(() => {
        originalMessageElement.classList.remove("highlight-message");
      }, 1500); // Remove highlight after 1.5 seconds
    }
  }, []);

  // useEffect(() => {
  //   if (selectedConversation && messageInputRef.current) {
  //     messageInputRef.current.focus();
  //   }
  // }, [selectedConversation, messageInputRef]);

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar pt-20">
      {error && !isNewChat && (
        <div className="flex justify-center items-center h-full text-red-500">
          <p>Error loading messages: {error.message}</p>
        </div>
      )}

      {!isNewChat &&
        messagesToRender.length > 0 &&
        messagesToRender.map((msg) => {
          const isSentByCurrentUser = msg.sender._id === currentUser._id;

          return (
            <div key={msg._id} id={`message-${msg._id}`}>
              <div
                className={`flex ${
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
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100
                          transition-opacity duration-200 cursor-pointer text-gray-400 hover:text-primary
                           ${
                             isSentByCurrentUser
                               ? "right-[calc(100%+8px)]"
                               : "scale-x-[-1] left-[calc(100%+8px)]"
                           } `}
                    onClick={() => handleReplyClick(msg)}
                  >
                    <FaReply size={18} />
                  </div>
                  {isSentByCurrentUser && (
                    <button
                      onClick={() => handleDeleteClick(msg._id)}
                      className={`absolute top-1/2 -translate-y-1/2 text-xs  rounded-full text-red-600 hover:bg-red-600 hover:bg-opacity-25 p-1.5
                                  opacity-0 group-hover:opacity-100 transition duration-200 z-10
                                  ${isSentByCurrentUser ? "right-[calc(100%+30px)]" : ""}
                                  ${
                                    isDeletingMessage
                                      ? "cursor-not-allowed"
                                      : "cursor-pointer"
                                  }
                                   `}
                      title="Delete message"
                      disabled={isDeletingMessage}
                    >
                      {isDeletingMessage ? (
                        <span className={`loading loading-spinner loading-xs`} />
                      ) : (
                        <FiTrash size={20} />
                      )}
                    </button>
                  )}
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
      <div ref={messagesEndRef} />
    </div>
  );
}

export default React.memo(MessageList);
