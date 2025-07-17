// src/pages/publicChat/PublicChatPage.jsx

import React, { useRef, useEffect, useCallback, useState } from "react";
import { IoSendSharp } from "react-icons/io5";
import { FaImage } from "react-icons/fa6";
import toast from "react-hot-toast";
import { Link } from "react-router-dom"; // Added Link import

// You'll need a way to show time, for example:
import { formatDistanceToNowStrict } from "date-fns";
import {
  useBanUserFromPublicChat,
  useDeletePublicMessage,
  usePublicMessages,
  useSendPublicMessage,
  useUnbanUserFromPublicChat,
} from "../../hooks/publicChatHooks/publicChatHooks";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import PublicChatMessage from "./PublicChatMessage";

const PublicChatPage = ({ openImageModal }) => {
  const { authUser, isLoading: isLoadingAuthUser } = useAuthUser();
  const {
    messages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMessages,
    isError: isMessagesError,
    error: messagesError,
  } = usePublicMessages();

  const { sendPublicMessage, isPending: isSendingMessage } = useSendPublicMessage();
  const { deletePublicMessage } = useDeletePublicMessage();
  const { banUser } = useBanUserFromPublicChat();
  const { unbanUser } = useUnbanUserFromPublicChat();

  const [messageContent, setMessageContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  const previousScrollHeight = useRef(0);
  const isInitialLoad = useRef(true);

  // Initial scroll to bottom
  useEffect(() => {
    if (!isLoadingMessages && messages.length > 0 && isInitialLoad.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant", block: "end" });
      isInitialLoad.current = false;
    }
  }, [isLoadingMessages, messages.length]);

  // Scroll to bottom when new message is added (only if already near bottom)
  useEffect(() => {
    if (messages.length > 0 && scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop <= clientHeight + 100;

      if (isNearBottom || (messages.length === 1 && !isInitialLoad.current)) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }
  }, [messages.length]);

  // Handle scroll to load more and maintain position
  const handleScroll = useCallback(() => {
    const currentScrollContainer = scrollContainerRef.current;
    if (currentScrollContainer) {
      const { scrollTop } = currentScrollContainer;

      // Use a small tolerance for scrollTop, e.g., <= 5 pixels
      // This helps with inconsistencies in mobile browser scroll reporting
      if (scrollTop <= 5 && hasNextPage && !isFetchingNextPage) {
        console.log("Reached top, fetching more messages..."); // Debugging
        previousScrollHeight.current = currentScrollContainer.scrollHeight;
        fetchNextPage();
      }
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Effect to restore scroll position after loading older messages
  useEffect(() => {
    if (
      !isFetchingNextPage &&
      scrollContainerRef.current &&
      previousScrollHeight.current > 0
    ) {
      const newScrollHeight = scrollContainerRef.current.scrollHeight;
      scrollContainerRef.current.scrollTop =
        newScrollHeight - previousScrollHeight.current;
      previousScrollHeight.current = 0;
      console.log("Restored scroll position."); // Debugging
    }
  }, [isFetchingNextPage]);

  // Attach scroll listener
  useEffect(() => {
    const currentRef = scrollContainerRef.current;
    if (currentRef) {
      // Consider adding { passive: true } if it's causing issues,
      // but usually, browsers optimize scroll events to be passive by default.
      // For now, let's just ensure it's attached.
      currentRef.addEventListener("scroll", handleScroll);
      return () => currentRef.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (isSendingMessage) return;

    let imgBase64 = null;
    if (selectedFile) {
      try {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onloadend = async () => {
          imgBase64 = reader.result;
          await sendPublicMessage({ content: messageContent, imgBase64 });
          setMessageContent("");
          setSelectedFile(null);
          setPreviewImage(null);
          fileInputRef.current.value = "";
        };
      } catch (error) {
        toast.error("Failed to read image file.");
      }
    } else {
      if (!messageContent.trim()) return;
      await sendPublicMessage({ content: messageContent, imgBase64: null });
      setMessageContent("");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreviewImage(null);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewImage(null);
    fileInputRef.current.value = "";
  };

  if (isLoadingAuthUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-lg text-primary">
        Please log in to join the public chat.
      </div>
    );
  }

  if (isMessagesError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-lg text-error">
        Error loading messages: {messagesError.message}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-base-100">
      <div className="flex-grow overflow-scroll p-4 min-h-0 h-px" ref={scrollContainerRef}>
        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <LoadingSpinner size="sm" />
          </div>
        )}
        {messages.map((message) => (
          <PublicChatMessage
            key={message._id}
            message={message}
            authUser={authUser}
            openImageModal={openImageModal}
            onDelete={deletePublicMessage}
            onBan={banUser}
            onUnban={unbanUser}
          />
        ))}
        {isLoadingMessages && messages.length === 0 && (
          <div className="flex justify-center py-2">
            <LoadingSpinner size="sm" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSendMessage}
        className="sticky bottom-0 bg-base-100 p-4 border-t border-accent flex flex-col gap-2 flex-shrink-0"
      >
        {previewImage && (
          <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-accent">
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs opacity-80 hover:opacity-100 transition-opacity"
            >
              X
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Type your message..."
            className="input input-bordered w-full rounded-full bg-base-300 text-base-content"
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            disabled={isSendingMessage}
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
            accept="image/*"
            id="image-upload-public-chat"
          />
          <label
            htmlFor="image-upload-public-chat"
            className="btn btn-ghost btn-circle text-primary hover:bg-base-300"
          >
            <FaImage className="w-5 h-5" />
          </label>
          <button
            type="submit"
            className="btn btn-primary btn-circle"
            disabled={isSendingMessage || (!messageContent.trim() && !selectedFile)}
          >
            {isSendingMessage ? (
              <LoadingSpinner size="sm" />
            ) : (
              <IoSendSharp className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PublicChatPage;
