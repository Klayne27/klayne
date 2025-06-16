// src/components/messages/ChatWindow.jsx (Re-confirm and minor tweaks)

import { IoClose } from "react-icons/io5";
import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../../context/SocketContext";
import { FaPaperclip, FaRegSmile } from "react-icons/fa";
import { IoImageOutline } from "react-icons/io5";
import { HiOutlineGif } from "react-icons/hi2";
import { MdSend } from "react-icons/md";
import { BiArrowBack } from "react-icons/bi";
import LoadingSpinner from "../common/LoadingSpinner";
import { toast } from "react-hot-toast";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { Link } from "react-router-dom";
import { BsCheck2All } from "react-icons/bs";
import { PiSmiley } from "react-icons/pi";
import EmojiPicker from "emoji-picker-react";

const fetchMessages = async (conversationId, otherUserId) => {
  if (!conversationId || !otherUserId) return []; // No messages for new or undefined chat
  const res = await fetch(`/api/messages/${otherUserId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch messages");
  }
  return res.json();
};

const sendMessageApi = async ({ recipientId, message, img }) => {
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipientId, message, img }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to send message");
  }
  return res.json();
};

const ChatWindow = ({ selectedConversation, onBackToConversations }) => {
  const queryClient = useQueryClient();
  const { authUser: currentUser } = useAuthUser();
  const { socket } = useSocket();
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const imageInputRef = useRef(null);
  const messageInputRef = useRef(null); // <-- Add this ref
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerWidth, setEmojiPickerWidth] = useState(150);

  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  // Extract otherUser and conversationId safely
  const otherUser = selectedConversation?.participants[0];
  const conversationId = selectedConversation?._id; // Will be null for new chats

  const {
    data: messages,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages(conversationId, otherUser?._id),
    enabled: !!conversationId, // Only fetch messages if conversationId exists (i.e., not a new chat)
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  const sendMessageMutation = useMutation({
    mutationFn: sendMessageApi,
    onSuccess: async () => {
      queryClient.invalidateQueries(["messages"]);
      await queryClient.invalidateQueries(["conversations"]);

    },
    onError: (error) => {
      toast.error(error.message || "Failed to send message.");
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
        });
        setMessageInput("");
        setImageFile(null);
        if (imageInputRef.current) imageInputRef.current.value = "";
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
      });
      setMessageInput("");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Effect to listen for new messages via Socket.IO
  useEffect(() => {
    if (socket) {
      const handleNewMessage = (newMessage) => {
        // If a new conversation was just created, update the selectedConversation in parent (MessagesPage)
        // so that the ChatWindow's `conversationId` becomes non-null and it starts fetching messages.
        // This is important if the first message *creates* the conversation.
        if (
          selectedConversation?.isNewChat &&
          newMessage.conversationId &&
          newMessage.sender._id === currentUser._id
        ) {
          // This is the actual message we just sent that created the conversation
          // We need to find the full conversation object now.
          // A more robust solution might involve the backend sending the full conversation object
          // back with the `newMessage` event for the sender.
          // For now, we'll rely on the conversations query invalidation.
          queryClient.invalidateQueries(["conversations"]).then(() => {
            // After conversations are refetched, you might need to update the parent's `selectedConversation` state
            // This might need `onSelectConversation` passed from MessagesPage
            // For simplicity for now, the socket will directly push the new message.
          });
        }

        // Apply message to the current chat window if it matches
        if (
          newMessage.conversationId?.toString() === conversationId?.toString() ||
          (selectedConversation?.isNewChat &&
            newMessage.sender._id.toString() === currentUser._id.toString() &&
            newMessage.recipientId?.toString() === otherUser?._id.toString())
        ) {
          queryClient.setQueryData(
            ["messages", newMessage.conversationId || conversationId],
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
              conversationId: newMessage.conversationId || conversationId,
            });
          }
          scrollToBottom();
        }
        queryClient.invalidateQueries(["conversations"]);
      };

      const handleMessagesSeen = ({ conversationId: seenConversationId, readerId }) => {
        if (seenConversationId.toString() === conversationId?.toString()) {
          // Check against current convId
          queryClient.setQueryData(["messages", conversationId], (oldMessages) => {
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
  }, [socket, conversationId, queryClient, otherUser, currentUser, selectedConversation]); // Added selectedConversation to deps

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setEmojiPickerWidth(50);
      } else {
        setEmojiPickerWidth(350);
      }
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

  // Determine if it's a new chat (no messages loaded yet)
  const isNewChat =
    selectedConversation.isNewChat || (!messages?.length && !isLoading && !error);

  console.log("messages here:", messages);

  return (
    <div className="flex flex-col h-full bg-black text-white border-r border-gray-700">
      {/* Chat Header */}
      <div className="sticky top-0 bg-black w-full  z-20 p-4 shadow-lg flex items-center">
        {/* Optional: Back button for mobile */}
        {onBackToConversations && ( // Only show if prop is provided
          <button onClick={onBackToConversations} className="md:hidden mr-2 text-white">
            <BiArrowBack className="w-6 h-6" />
          </button>
        )}
        <Link to={`/profile/${otherUser.username}`}>
          <img
            src={otherUser?.profilePic || "/avatar-placeholder.png"}
            alt={otherUser?.username}
            className="w-8 h-8 rounded-full object-cover mr-2"
          />
        </Link>
        <h3 className="text-lg font-bold">{otherUser?.fullName}</h3>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
        {isLoading && (
          <div className="flex justify-center items-center h-full">
            <LoadingSpinner size="lg" />
          </div>
        )}
        {error && (
          <div className="flex justify-center items-center h-full text-red-500">
            <p>Error loading messages: {error.message}</p>
          </div>
        )}
        {isNewChat &&
          !isLoading && ( // Show new chat message only if no messages and not loading
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center">
              <p className="text-xl font-bold mb-2">
                Say hello to {otherUser?.fullName}!
              </p>
              <p className="text-sm">
                This is the start of your direct message conversation.
              </p>
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

      {imageFile && ( // Preview selected image
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
