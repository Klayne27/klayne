import { IoClose } from "react-icons/io5";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../../context/SocketContext";
import { IoImageOutline } from "react-icons/io5";
import { HiOutlineGif } from "react-icons/hi2";
import { MdSend } from "react-icons/md";
import { BiArrowBack } from "react-icons/bi";
import LoadingSpinner from "./LoadingSpinner"; // Assuming path is correct
import { toast } from "react-hot-toast";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import { BsCheck2All } from "react-icons/bs";
import { PiSmiley } from "react-icons/pi";
import EmojiPicker from "emoji-picker-react";

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
  return res.json();
};

// Backend Recommendation #2: Send message API now handles new conversation creation and returns its ID
// This endpoint assumes: POST /api/messages with body { recipientId, message, img, conversationId (optional) }
// And returns: { newMessage: { ... }, conversationId: "real_conversation_id" }
const sendMessageApi = async ({ recipientId, message, img, conversationId }) => {
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Pass conversationId to backend, which will handle existing vs. new
    body: JSON.stringify({ recipientId, message, img, conversationId }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to send message");
  }
  // Backend is expected to return { newMessage, conversationId }
  return res.json();
};

const ChatWindow = ({ selectedConversation, onBackToConversations }) => {
  const queryClient = useQueryClient();
  const { authUser: currentUser } = useAuthUser();
  const { socket } = useSocket();
  const navigate = useNavigate(); // For updating URL after new chat creation

  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const imageInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerWidth, setEmojiPickerWidth] = useState(150);

  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);

  // Determine the 'otherUser' correctly. 'participants' should contain current user and other user.
  const otherUser = selectedConversation?.participants.find(
    (p) => p?._id !== currentUser?._id
  );

  // The actual conversation ID to use for API calls (null for pseudo-chats)
  const actualConversationId = selectedConversation?.isNewChat
    ? null
    : selectedConversation?._id;

  const {
    data: messages,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["messages", actualConversationId], // Query key now uses actualConversationId
    queryFn: () => fetchMessages(actualConversationId), // Fetch only if actual ID exists
    enabled: !!actualConversationId, // Only enable query if it's a real conversation
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  const sendMessageMutation = useMutation({
    mutationFn: sendMessageApi,
    onSuccess: async (data) => {
      // Data now contains newMessage and the actual conversationId
      const { newMessage, conversationId: returnedConversationId } = data;

      // If it was a new chat (`isNewChat` was true) and backend returned a real ID
      if (selectedConversation.isNewChat && returnedConversationId) {
        // Update URL to the real conversation ID
        navigate(`/messages/${returnedConversationId}`, { replace: true });

        // Force a refetch of conversations to get the newly created one in the list,
        // and its `_id` will then correctly be picked up by MessagesPage's useEffect.
        await queryClient.invalidateQueries(["conversations"]);
      } else {
        // If it's an existing chat, just invalidate messages/conversations
        await queryClient.invalidateQueries(["conversations"]);
      }

      // Optimistically update messages list (optional, but good for UX)
      queryClient.setQueryData(
        ["messages", returnedConversationId || actualConversationId], // Use the real ID if available
        (oldMessages) => {
          const filteredOldMessages =
            oldMessages?.filter((msg) => !msg.isOptimistic) || [];
          if (!filteredOldMessages.some((msg) => msg._id === newMessage._id)) {
            return [...filteredOldMessages, { ...newMessage, isOptimistic: false }];
          }
          return filteredOldMessages;
        }
      );

      setMessageInput("");
      setImageFile(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      scrollToBottom();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send message.");
      queryClient.invalidateQueries(["messages"]); // Invalidate on error to revert optimistic updates
    },
    onMutate: async (newMessageData) => {
      // Use the potentially new conversation ID for optimistic update key
      const targetConvId =
        newMessageData.conversationId || `new-${newMessageData.recipientId}`; // Use pseudo-id for new chat
      await queryClient.cancelQueries(["messages", targetConvId]);
      const previousMessages = queryClient.getQueryData(["messages", targetConvId]);

      const optimisticMessage = {
        _id: `temp-${Date.now()}`,
        sender: {
          _id: currentUser._id,
          username: currentUser.username,
          fullName: currentUser.fullName,
          profileImg: currentUser.profileImg,
        },
        recipientId: newMessageData.recipientId,
        text: newMessageData.message,
        img: newMessageData.img,
        createdAt: new Date().toISOString(),
        seen: false,
        isOptimistic: true,
      };

      queryClient.setQueryData(["messages", targetConvId], (old) =>
        old ? [...old, optimisticMessage] : [optimisticMessage]
      );

      return { previousMessages, targetConvId }; // Return targetConvId in context
    },
    onSettled: (data, error, variables, context) => {
      // Invalidate the query to ensure we fetch the latest state from the server
      // after the mutation is settled, whether successful or not.
      queryClient.invalidateQueries(["messages", context.targetConvId]);
    },
  });

  const onEmojiClick = (emojiObject) => {
    setMessageInput((prevText) => prevText + emojiObject.emoji);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() && !imageFile) return;
    if (!otherUser) return toast.error("No recipient selected.");

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
      });
    }
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
          scrollToBottom();
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

      socket.on("newMessage", handleNewMessage);
      socket.on("messagesSeen", handleMessagesSeen);

      return () => {
        socket.off("newMessage", handleNewMessage);
        socket.off("messagesSeen", handleMessagesSeen);
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
    scrollToBottom();
  }, [messages]);

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

  // A new chat is either explicitly marked `isNewChat` or it's a "real" conversation
  // but has no messages yet.
  const isNewChat =
    selectedConversation.isNewChat ||
    (!messages?.length && !isLoading && !error && actualConversationId);

  return (
    <div className="flex flex-col h-full bg-black text-white border-r border-gray-700">
      {/* Chat Header */}
      <div className="sticky top-0 bg-black w-full z-20 p-4 shadow-lg flex items-center">
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
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
        {isLoading &&
          !isNewChat && ( // Only show loading if it's an existing chat and loading
            <div className="flex justify-center items-center h-full">
              <LoadingSpinner size="lg" />
            </div>
          )}
        {error &&
          !isNewChat && ( // Only show error if it's an existing chat and error
            <div className="flex justify-center items-center h-full text-red-500">
              <p>Error loading messages: {error.message}</p>
            </div>
          )}

        {!isNewChat &&
          messages &&
          messages.length > 0 &&
          messages.map((msg) => {
            const isSentByCurrentUser = msg.sender._id === currentUser._id;
            return (
              <div
                key={msg._id}
                className={`flex ${
                  isSentByCurrentUser ? "justify-end" : "justify-start"
                } items-start`}
              >
                <div
                  className={`flex flex-col max-w-[70%] p-3 rounded-3xl
                                ${
                                  isSentByCurrentUser
                                    ? "bg-primary text-white rounded-br-[4px]"
                                    : "bg-gray-800 text-white rounded-bl-[4px]"
                                }`}
                >
                  {msg.img && (
                    <img
                      src={msg.img}
                      alt="message attachment"
                      className="mt-2 rounded-lg w-60 h-auto object-cover"
                    />
                  )}
                  {msg.text && <p className="break-words text-sm">{msg.text}</p>}

                  <span
                    className={`text-xs mt-1 flex ${
                      isSentByCurrentUser ? "text-blue-200" : "text-gray-400"
                    } self-end`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {isSentByCurrentUser && msg.seen && (
                      <span className={`self-end ml-1`}>
                        <BsCheck2All size={16} />
                      </span>
                    )}
                  </span>
                </div>
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

      {/* Message Input Area */}
      <form
        onSubmit={handleSendMessage}
        className="p-2 border-t border-gray-700 bg-black flex items-center "
      >
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
          ref={imageInputRef}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => imageInputRef.current.click()}
          className="p-2 text-primary rounded-full hover:bg-gray-900 transition-colors duration-200"
        >
          <IoImageOutline className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="p-2 text-primary rounded-full hover:bg-gray-900 transition-colors duration-200"
        >
          <HiOutlineGif className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="p-2 relative text-primary rounded-full hover:bg-gray-900 transition-colors duration-200"
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

        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Start a new message"
          className="flex-1 px-3 py-2 mr-2 rounded-full bg-gray-800 text-white placeholder-gray-400 border border-transparent focus:border-primary focus:outline-none"
          disabled={sendMessageMutation.isPending}
          ref={messageInputRef}
        />
        <button
          type="submit"
          disabled={sendMessageMutation.isPending || (!messageInput.trim() && !imageFile)}
          className={`p-2 rounded-full ${
            messageInput.trim() || imageFile
              ? "bg-primary text-white"
              : "bg-primary text-blue-200 opacity-50 cursor-not-allowed"
          }
            transition-colors duration-200`}
        >
          <MdSend className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
