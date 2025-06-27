import React, { useCallback, forwardRef } from "react"; // Import forwardRef
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { truncateText } from "../../utils/truncateText";
import { FaReply } from "react-icons/fa";
import { FiTrash } from "react-icons/fi";
import { renderClickableText } from "../../utils/textUtils";
import { BsCheck2All } from "react-icons/bs";
import LoadingSpinner from "./LoadingSpinner";

// Use forwardRef to allow the parent component (ChatWindow) to attach a ref to this component's DOM element
const MessageList = forwardRef(function MessageList( // Changed to named function for better dev tools
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
    isLoadingInitialMessages, // NEW prop: For initial full page load
    isFetchingOlderMessages, // NEW prop: For loading older messages when scrolling up
    hasNextPage, // NEW prop: To know if there are more pages
  },
  ref 
) {
  const { authUser: currentUser } = useAuthUser();
  // const prevMessagesLength = useRef(0); // This can still be useful for managing scroll behavior
  // const initialLoadRef = useRef(true); // Flag to handle initial scroll correctly

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

  // Adjusted useEffect for initial scroll and new messages
  // useEffect(() => {
  //   if (ref.current) {
  //     const currentLength = messagesToRender ? messagesToRender.length : 0;

  //     // Logic for initial load or new messages (scroll to bottom)
  //     // Only scroll to bottom if it's the very first load or if new messages have arrived
  //     // AND we are not currently fetching older messages (which means we scrolled up)
  //     if (initialLoadRef.current && !isLoadingInitialMessages) {
  //       ref.current.scrollTop = ref.current.scrollHeight;
  //       initialLoadRef.current = false; // Reset after initial scroll
  //     } else if (currentLength > prevMessagesLength.current && !isFetchingOlderMessages) {
  //       // Only scroll to bottom if new messages are added AND we are not fetching older ones
  //       ref.current.scrollTop = ref.current.scrollHeight;
  //     }

  //     prevMessagesLength.current = currentLength;
  //   }
  // }, [messagesToRender, ref, isLoadingInitialMessages, isFetchingOlderMessages]);

  // // Reset prevMessagesLength and initialLoadRef when conversation changes
  // useEffect(() => {
  //   prevMessagesLength.current = 0;
  //   initialLoadRef.current = true; // Set to true for the new conversation
  // }, [selectedConversation?._id]);

  return (
    // Attach the forwarded ref to the main scrollable div
    <div
      ref={ref}
      className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar pt-20"
    >
      {/* Loading indicator for initial messages */}
      {isLoadingInitialMessages && (
        <div className="flex justify-center items-center h-full">
          <LoadingSpinner size="md" /> {/* Adjust size as needed */}
        </div>
      )}
      {error && !isNewChat && !isLoadingInitialMessages && (
        <div className="flex justify-center items-center h-full text-red-500">
          <p>Error loading messages: {error.message}</p>
        </div>
      )}
      {/* Loading indicator for older messages (when scrolling up) */}
      {isFetchingOlderMessages && (
        <div className="flex justify-center py-2">
          <LoadingSpinner size="sm" /> {/* Smaller spinner for loading more */}
        </div>
      )}
      {/* "No more messages" indicator */}
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
                      className={`absolute top-1/2 -translate-y-1/2 text-xs rounded-full text-red-600 hover:bg-red-600 hover:bg-opacity-25 p-1.5
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
      {/* <div ref={messagesEndRef} /> This div ensures scrolling to the bottom */}
    </div>
  );
}); // End of forwardRef

export default React.memo(MessageList);
