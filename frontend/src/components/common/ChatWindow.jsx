import { IoClose } from "react-icons/io5";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../../context/SocketContext";
import { IoImageOutline } from "react-icons/io5";
import { HiOutlineGif } from "react-icons/hi2";
import { MdSend } from "react-icons/md";
import { BiArrowBack } from "react-icons/bi";
import { toast } from "react-hot-toast";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import { PiSmiley } from "react-icons/pi";
import EmojiPicker from "emoji-picker-react";
import { FaReply } from "react-icons/fa6";
import { useDeleteMessage } from "../../hooks/messagesHooks/useDeleteMessage";
import { FiTrash } from "react-icons/fi";

const truncateText = (text, maxLength = 30) => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

// Backend Recommendation #1: Fetch messages using conversationId
// This endpoint assumes: GET /api/messages/conversation/:conversationId
const fetchMessages = async (conversationId) => {
  // Frontend check: don't attempt to fetch for pseudo-conversations
  if (!conversationId || conversationId.startsWith("new-")) return [];

  // Backend endpoint is now /api/messages/conversation/:conversationId
  const res = await fetch(`/api/messages/conversations/${conversationId}`);
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to fetch messages");
  }
  const data = await res.json();
  // Ensure it always returns an array, even if backend sends null/undefined/{}
  return Array.isArray(data) ? data : [];
};

const sendMessageApi = async ({
  recipientId,
  message,
  img,
  conversationId,
  repliedTo,
}) => {
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Pass conversationId to backend, which will handle existing vs. new
    body: JSON.stringify({ recipientId, message, img, conversationId, repliedTo }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to send message");
  }
  // Backend is expected to return { newMessage, conversationId }
  return res.json();
};

const ChatWindow = ({
  selectedConversation,
  onBackToConversations,
  onNewConversationCreated,
}) => {
  const queryClient = useQueryClient();
  const { authUser: currentUser } = useAuthUser();
  const { socket } = useSocket();
  const navigate = useNavigate(); // For updating URL after new chat creation
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);

  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const imageInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerWidth, setEmojiPickerWidth] = useState(150);

  const [replyingToMessage, setReplyingToMessage] = useState(null);

  const actualConversationId = selectedConversation?.isNewChat
    ? null
    : selectedConversation?._id;

  const isNewOrTemporaryChat =
    selectedConversation?.isNewChat || selectedConversation?.isTemporary;

  const { deleteMessage, isDeletingMessage } = useDeleteMessage(actualConversationId);

  const currentOptimisticIdRef = useRef(null);

  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);

  const otherUser = selectedConversation?.participants.find(
    (p) => p?._id !== currentUser?._id
  );

  const {
    data: messages,
    isLoading,
    refetch: refetchMessages,
    error,
  } = useQuery({
    queryKey: ["messages", selectedConversation?._id],
    queryFn: () => {
      // Only fetch if it's a real conversation ID, not a pseudo 'new-' ID
      if (
        selectedConversation &&
        !selectedConversation.isNewChat &&
        !selectedConversation.isTemporary
      ) {
        return fetchMessages(selectedConversation._id);
      }
      return Promise.resolve([]); // Return empty array if no real conversation selected
    },
    enabled:
      !!selectedConversation &&
      !selectedConversation.isNewChat &&
      !selectedConversation.isTemporary, // Only enable if not a new/temporary chat
  });

  const sendMessageMutation = useMutation({
    mutationFn: sendMessageApi,
    onMutate: async (newMessageData) => {
      await queryClient.cancelQueries(["messages", selectedConversation?._id]);
      const previousMessages = queryClient.getQueryData([
        "messages",
        selectedConversation?._id,
      ]);
      setShouldScrollToBottom(true);

      const tempMessageId = `temp-${Date.now()}-${Math.random()}`;
      currentOptimisticIdRef.current = tempMessageId; // Store the ID of this specific optimistic message

      const tempMessage = {
        _id: tempMessageId, // Use the stored temporary ID
        text: newMessageData.message,
        sender: {
          _id: currentUser._id,
          username: currentUser.username,
          fullName: currentUser.fullName,
          profileImg: currentUser.profileImg,
          isVerified: currentUser.isVerified,
        },
        conversationId: selectedConversation._id,
        createdAt: new Date().toISOString(),
        img: newMessageData.img || null,
        seen: false,
        isOptimistic: true,
        repliedTo: replyingToMessage
          ? {
              // Add optimistic repliedTo structure
              _id: replyingToMessage._id,
              text: replyingToMessage.text,
              img: replyingToMessage.img,
              sender: {
                _id: replyingToMessage.sender._id,
                username: replyingToMessage.sender.username,
                fullName: replyingToMessage.sender.fullName,
                profileImg: replyingToMessage.sender.profileImg,
                isVerified: replyingToMessage.sender.isVerified,
              },
            }
          : null,
      };

      queryClient.setQueryData(["messages", selectedConversation?._id], (oldMessages) => {
        return [...(oldMessages || []), tempMessage];
      });

      return { previousMessages, optimisticId: tempMessageId }; // Pass optimisticId to context
    },
    onSuccess: (data, variables, context) => {
      // Access context here
      const { newMessage, conversationId: newRealConversationId } = data;

      // Update the messages cache for the REAL conversation ID
      // This is crucial: if a new conversation was created, the query key changes.
      queryClient.setQueryData(["messages", newRealConversationId], (oldMessages) => {
        const messagesArray = oldMessages || [];

        // Try to find and replace the specific optimistic message
        const updatedMessages = messagesArray.map((msg) =>
          msg._id === context.optimisticId ? newMessage : msg
        );

        // If the optimistic message wasn't found (e.g., in a very fast response or if cache was cleared/updated),
        // or if it's a completely new list, append the new message.
        if (!updatedMessages.some((msg) => msg._id === newMessage._id)) {
          return [...updatedMessages, newMessage];
        }

        return updatedMessages;
      });

      // --- Handle conversation ID change for new chats ---
      // If the selected conversation was a pseudo-ID ('new-...') or temporary,
      // and now we have a real conversationId from the backend:
      if (isNewOrTemporaryChat && selectedConversation._id !== newRealConversationId) {
        // Remove the old pseudo-ID's cache if it exists, to avoid stale data
        queryClient.removeQueries(["messages", selectedConversation._id]);

        // Notify parent (MessagesPage) to navigate to the real URL and refetch conversations list
        if (onNewConversationCreated) {
          onNewConversationCreated(newRealConversationId);
        }
      } else {
        // If it was already a real conversation, ensure parent refetches conversations
        // to update lastMessage, updatedAt etc.
        queryClient.invalidateQueries(["conversations"]);
      }
    },
    onError: (error, variables, context) => {
      // Access context here
      console.error("Error sending message:", error);
      // Rollback optimistic update: filter out the specific optimistic message
      queryClient.setQueryData(["messages", selectedConversation._id], (oldMessages) => {
        return (oldMessages || []).filter((msg) => msg._id !== context.optimisticId);
      });
      currentOptimisticIdRef.current = null; // Clear the ref on error
      // toast.error("Failed to send message."); // Re-enable if you have a toast library
    },
    onSettled: (data, error, variables, context) => {
      // Invalidate the query to ensure we fetch the latest state from the server
      // after the mutation is settled, whether successful or not.

      queryClient.invalidateQueries(["messages", context.targetConvId]);
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    },
  });

  const onEmojiClick = (emojiObject) => {
    setMessageInput((prevText) => prevText + emojiObject.emoji);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() && !imageFile) return;
    if (!otherUser) return toast.error("No recipient selected.");

    const repliedToId = replyingToMessage ? replyingToMessage._id : null; // Get ID if replying

    let imgBase64 = null;
    if (imageFile) {
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      reader.onloadend = () => {
        imgBase64 = reader.result;
        sendMessageMutation.mutate({
          recipientId: otherUser._id,
          message: messageInput.trim(),
          img: imgBase64,
          conversationId: actualConversationId, // Pass actual ID (null for new chat)
          repliedTo: repliedToId, // Pass repliedTo ID
        });
      };
      reader.onerror = (error) => {
        console.error("Error converting image:", error);
        toast.error("Failed to process image.");
      };
    } else {
      sendMessageMutation.mutate({
        recipientId: otherUser._id,
        message: messageInput.trim(),
        img: null,
        conversationId: actualConversationId, // Pass actual ID (null for new chat)
        repliedTo: repliedToId, // Pass repliedTo ID
      });
    }
    setMessageInput(""); // Clear input field
    currentOptimisticIdRef.current = null; // Clear the ref after success
    setReplyingToMessage(null); // Clear replyingToMessage on success
    setImageFile("");
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Effect to listen for new messages via Socket.IO
  useEffect(() => {
    if (socket) {
      const handleNewMessage = (newMessage) => {
        const isMessageForThisChat =
          newMessage.conversationId === actualConversationId ||
          (selectedConversation?.isNewChat &&
            newMessage.sender._id.toString() === otherUser?._id.toString() && // Message from other user for this new chat
            newMessage.recipientId?.toString() === currentUser._id.toString()); // And sent to current user

        if (isMessageForThisChat) {
          queryClient.setQueryData(
            ["messages", newMessage.conversationId || actualConversationId],
            (oldMessages) => {
              const filteredOldMessages =
                oldMessages?.filter((msg) => !msg.isOptimistic) || [];
              if (!filteredOldMessages.some((msg) => msg._id === newMessage._id)) {
                return [...filteredOldMessages, newMessage];
              }
              return filteredOldMessages;
            }
          );

          if (newMessage.sender._id.toString() === otherUser?._id.toString()) {
            socket.emit("markMessagesAsSeen", {
              conversationId: newMessage.conversationId,
            });
          }
          setShouldScrollToBottom(true);
        }
        queryClient.invalidateQueries(["conversations"]);
      };

      const handleMessagesSeen = ({ conversationId: seenConversationId, readerId }) => {
        if (seenConversationId.toString() === actualConversationId?.toString()) {
          queryClient.setQueryData(["messages", actualConversationId], (oldMessages) => {
            return oldMessages?.map((msg) =>
              msg.sender._id.toString() === currentUser._id.toString() &&
              readerId.toString() === otherUser?._id.toString()
                ? { ...msg, seen: true }
                : msg
            );
          });
        }
        queryClient.invalidateQueries(["conversations"]);
      };

      const handleMessageDeleted = ({
        messageId,
        conversationId: deletedConversationId,
      }) => {
        if (deletedConversationId.toString() === actualConversationId?.toString()) {
          queryClient.setQueryData(["messages", actualConversationId], (oldMessages) => {
            return oldMessages?.filter((msg) => msg._id !== messageId);
          });
        }
        queryClient.invalidateQueries(["conversations"]);
      };

      socket.on("newMessage", handleNewMessage);
      socket.on("messagesSeen", handleMessagesSeen);
      socket.on("messageDeleted", handleMessageDeleted);

      return () => {
        socket.off("newMessage", handleNewMessage);
        socket.off("messagesSeen", handleMessagesSeen);
        socket.off("messageDeleted", handleMessageDeleted);
      };
    }
  }, [
    socket,
    actualConversationId,
    queryClient,
    otherUser,
    currentUser,
    selectedConversation,
  ]);

  useEffect(() => {
    const handleResize = () => {
      setEmojiPickerWidth(window.innerWidth < 640 ? 250 : 350);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  useEffect(() => {
    if (!isLoading) {
      scrollToBottom();
    }
  }, [selectedConversation?._id, isLoading]);

  const handleDeleteClick = useCallback(
    (messageId) => {
      deleteMessage(messageId);
    },
    [deleteMessage]
  );

  useEffect(() => {
    if (shouldScrollToBottom) {
      scrollToBottom();
      setShouldScrollToBottom(false);
    }
  }, [messages, shouldScrollToBottom]);

  const handleReplyClick = useCallback((message) => {
    setReplyingToMessage(message);
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, []); // useCallback to memoize

  // useEffect(() => {
  //   if (selectedConversation && messageInputRef.current) {
  //     messageInputRef.current.focus();
  //   }
  // }, [selectedConversation]);

  if (!selectedConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black text-gray-400">
        <p className="text-xl font-bold">You don't have a message selected</p>
        <p className="text-sm">
          Choose one from your existing messages, or start a new one.
        </p>
      </div>
    );
  }

  const isNewChat =
    selectedConversation.isNewChat ||
    (!messages?.length && !isLoading && !error && actualConversationId);

  const isTemporaryChat = selectedConversation?.isTemporary;

  const messagesToDisplay = isLoading || isTemporaryChat ? [] : messages || [];

  const messagesToRender = messagesToDisplay.filter(
    (msg) => !msg.isOptimistic || msg._id === currentOptimisticIdRef.current
  );

  return (
    <div className="flex flex-col h-full bg-black text-white border-r border-gray-700">
      <div className="fixed top-0 bg-black w-[680px] z-20 p-4 shadow-lg flex items-center bg-opacity-20 backdrop-blur-md ">
        {onBackToConversations && (
          <button onClick={onBackToConversations} className="md:hidden mr-2 text-white">
            <BiArrowBack className="w-6 h-6" />
          </button>
        )}
        <Link to={`/profile/${otherUser?.username}`}>
          <img
            src={otherUser?.profileImg || "/avatar-placeholder.png"}
            alt={otherUser?.username}
            className="w-8 h-8 rounded-full object-cover mr-2"
          />
        </Link>
        <h3 className="text-lg font-bold">{otherUser?.fullName}</h3>
        {otherUser?.isVerified && (
          <img src="/verified.png" className="size-[17px] ml-1" alt="Verified badge" />
        )}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar pt-20">
        {/* {!isLoading &&
          isNewChat &&
          isTemporaryChat && ( // Only show loading if it's an existing chat and loading
            <div className="flex justify-center items-center h-full">
              <LoadingSpinner size="lg" />
            </div>
          )} */}
        {error &&
          !isNewChat && ( // Only show error if it's an existing chat and error
            <div className="flex justify-center items-center h-full text-red-500">
              <p>Error loading messages: {error.message}</p>
            </div>
          )}

        {!isNewChat &&
          messagesToRender.length > 0 &&
          messagesToRender.map((msg) => {
            const isSentByCurrentUser = msg.sender._id === currentUser._id;

            return (
              <div key={msg._id}>
                <div
                  className={`flex ${
                    isSentByCurrentUser ? "justify-end" : "justify-start"
                  } items-start group relative`} // Added group and relative for reply icon positioning
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
                      // Adjusted positioning: 'right-[calc(100%+8px)]' for sent, 'left-[calc(100%+8px)]' for received
                      onClick={() => handleReplyClick(msg)}
                    >
                      <FaReply size={18} />
                    </div>
                    {/* NEW: Delete Button */}
                    {isSentByCurrentUser && (
                      <button
                        onClick={() => handleDeleteClick(msg._id)}
                        className={`absolute top-1/2 -translate-y-1/2 text-xs  rounded-full text-red-600 hover:bg-red-600 hover:bg-opacity-25 p-1.5
                                                    opacity-0 group-hover:opacity-100 transition duration-200 z-10
                                                    ${
                                                      isSentByCurrentUser
                                                        ? "right-[calc(100%+30px)]"
                                                        : ""
                                                    }
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
                            flex flex-col
                        `}
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
                            {truncateText(msg.repliedTo.text, 50)}
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
                        className="mt-2 rounded-lg w-60 h-auto object-cover"
                      />
                    )}
                    {msg.text && <p className="break-words text-sm">{msg.text}</p>}
                  </div>
                  {/* {isSentByCurrentUser && msg.seen && (
                      <span className={`self-end ml-1`}>
                        <BsCheck2All size={16} />
                      </span>
                    )} */}
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

      {imageFile && (
        <div className="mt-4 border-t border-gray-700 p-5 flex">
          <div className="relative">
            <img
              src={URL.createObjectURL(imageFile)}
              alt="Preview"
              className="max-w-[200px] max-h-[200px] object-contain rounded-md"
            />
            <button
              onClick={() => setImageFile(null)}
              className="absolute right-1 top-1 p-1 text-white rounded-full bg-black hover:bg-gray-700"
            >
              <IoClose size={15} />
            </button>
          </div>
        </div>
      )}

      {/* REPLY PREVIEW IN INPUT AREA */}
      {replyingToMessage && (
        <div className="p-2 pt-0 border-t border-gray-700 bg-black flex items-center justify-between">
          <div className="flex-1 p-3  rounded-md flex flex-col">
            <div className="text-sm text-primary font-bold">Replying to</div>
            <div className="text-xs text-gray-400 mt-1 italic">
              {truncateText(replyingToMessage.text, 40)}
              {replyingToMessage.img && !replyingToMessage.text && " (Image)"}
            </div>
          </div>
          <button
            onClick={() => setReplyingToMessage(null)}
            className="ml-2 p-1 text-gray-400 hover:text-white rounded-full hover:bg-gray-700"
          >
            <IoClose size={18} />
          </button>
        </div>
      )}

      {/* Message Input Area */}
      <form
        onSubmit={handleSendMessage}
        // The form itself acts as a flex container for the main message box
        className="p-2 border-t border-gray-700 bg-black flex items-center"
      >
        {/* Hidden file input */}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
          ref={imageInputRef}
          className="hidden"
        />

        <div className="flex-1 relative flex items-center rounded-full bg-gray-800 border border-transparent focus-within:border-primary">
          <div className="flex pl-1">
            <button
              type="button"
              onClick={() => imageInputRef.current.click()}
              className="p-1 text-primary rounded-full hover:bg-gray-700 transition-colors duration-200"
            >
              <IoImageOutline className="w-5 h-5" />
            </button>
            <button
              type="button"
              className=" text-primary rounded-full hover:bg-gray-700 transition-colors duration-200"
            >
              <HiOutlineGif className="w-5 h-5" />
            </button>
            <button
              type="button"
              className="p-2 relative text-primary rounded-full hover:bg-gray-700 transition-colors duration-200 hidden md:block"
            >
              <PiSmiley
                className="w-5 h-5"
                ref={emojiButtonRef}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              />
              {showEmojiPicker && (
                <div className="absolute bottom-full -left-40 z-10" ref={emojiPickerRef}>
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    width={emojiPickerWidth}
                    theme="dark"
                  />{" "}
                </div>
              )}
            </button>
          </div>

          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Start a new message"
            className="flex-1 py-2 bg-gray-800 rounded-full text-white placeholder-gray-400 focus:outline-none pl-1 pr-10 w-1"
            disabled={sendMessageMutation.isPending}
            ref={messageInputRef}
          />

          <button
            type="submit"
            disabled={
              sendMessageMutation.isPending || (!messageInput.trim() && !imageFile)
            }
            className={`absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full ${
              messageInput.trim() || imageFile
                ? "bg-primary text-white"
                : "bg-primary text-blue-200 opacity-50 cursor-not-allowed"
            } transition-colors duration-200`}
          >
            <MdSend className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
