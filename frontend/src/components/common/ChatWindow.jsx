import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../../context/SocketContext";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useDeleteMessage } from "../../hooks/messagesHooks/useDeleteMessage";
import { useSendMessage } from "../../hooks/messagesHooks/useSendMessage";
import { useFetchMessages } from "../../hooks/messagesHooks/useFetchMessages";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";
import ChatHeader from "./ChatHeader";
// import { BsCheck2All, BsCheck2 } from "react-icons/bs";

const ChatWindow = ({
  selectedConversation,
  onBackToConversations,
  onNewConversationCreated,
  openImageModal,
}) => {
  const queryClient = useQueryClient();
  const { authUser: currentUser } = useAuthUser();
  const { socket, setActiveConversationId } = useSocket();

  const [replyingToMessage, setReplyingToMessage] = useState(null);

  const messageInputRef = useRef(null);
  const currentOptimisticIdRef = useRef(null);

  const actualConversationId = selectedConversation?.isNewChat
    ? null
    : selectedConversation?._id;

  const isNewOrTemporaryChat =
    selectedConversation?.isNewChat || selectedConversation?.isTemporary;

  const otherUser = selectedConversation?.participants.find(
    (p) => p?._id !== currentUser?._id
  );

  const { deleteMessage, isDeletingMessage } = useDeleteMessage(actualConversationId);
  const { messages, isLoading, error } = useFetchMessages(selectedConversation);
  const { sendMessage, isSendingMessage } = useSendMessage({
    selectedConversation,
    isNewOrTemporaryChat,
    onNewConversationCreated,
    replyingToMessage,
    currentOptimisticIdRef,
    actualConversationId,
  });

  useEffect(() => {
    setActiveConversationId(actualConversationId);
    return () => {
      setActiveConversationId(null);
    };
  }, [actualConversationId, setActiveConversationId]);

  useEffect(() => {
    if (socket && actualConversationId && currentUser?._id) {

      socket.emit("markMessagesAsSeen", { conversationId: actualConversationId });
    }
  }, [socket, actualConversationId, currentUser]);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (newMessage) => {
        const isMessageForThisChat =
          newMessage.conversationId === actualConversationId ||
          (selectedConversation?.isNewChat &&
            newMessage.sender._id.toString() === otherUser?._id.toString() &&
            newMessage.recipientId?.toString() === currentUser._id.toString());

        const shouldInvalidateConversations =
          isMessageForThisChat || newMessage.conversationId;

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
        }
        if (shouldInvalidateConversations) {
          queryClient.invalidateQueries(["conversations"]);
        }
      };

      // const handleMessagesSeen = ({ conversationId: seenConversationId, readerId }) => {
      //   if (seenConversationId.toString() === actualConversationId?.toString()) {
      //     queryClient.setQueryData(["messages", actualConversationId], (oldMessages) => {
      //       return oldMessages?.map((msg) =>
      //         msg.sender._id.toString() === currentUser._id.toString() &&
      //         readerId.toString() === otherUser?._id.toString()
      //           ? { ...msg, seen: true }
      //           : msg
      //       );
      //     });
      //   }
      //   queryClient.invalidateQueries(["conversations"]);
      // };

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
      socket.on("messageDeleted", handleMessageDeleted);
      // socket.on("messagesSeen", handleMessagesSeen);

      return () => {
        socket.off("newMessage", handleNewMessage);
        socket.off("messageDeleted", handleMessageDeleted);
        // socket.off("messagesSeen", handleMessagesSeen);
      };
    }
  }, [
    socket,
    actualConversationId,
    queryClient,
    otherUser,
    currentUser,
    selectedConversation,
    currentOptimisticIdRef,
  ]);

  const isNewChat =
    selectedConversation.isNewChat ||
    (!messages?.length && !isLoading && !error && actualConversationId);
 
  const messagesToDisplay = useMemo(() => {
    return isLoading || isNewOrTemporaryChat ? [] : messages || [];
  }, [isLoading, isNewOrTemporaryChat, messages]);

  const messagesToRender = useMemo(() => {
    return messagesToDisplay.filter(
      (msg) => !msg.isOptimistic || msg._id === currentOptimisticIdRef.current
    );
  }, [messagesToDisplay, currentOptimisticIdRef.current]);

  const memoizedSetReplyingToMessage = useCallback((message) => {
    setReplyingToMessage(message);
  }, []);

  const memoizedDeleteMessage = useCallback(
    (messageId) => {
      deleteMessage(messageId);
    },
    [deleteMessage]
  );

  // --- Existing useEffect for focusing input when conversation changes ---
  // useEffect(() => {
  //   if (messageInputRef.current) {
  //     const timer = setTimeout(() => {
  //       messageInputRef.current.focus();
  //     }, 0);
  //     return () => clearTimeout(timer);
  //   }
  // }, [selectedConversation, messageInputRef]);
  
  return (
    <div className="flex flex-col h-full bg-black text-white border-r border-gray-700">
      <ChatHeader onBackToConversations={onBackToConversations} otherUser={otherUser} />

      <MessageList
        error={error}
        isNewChat={isNewChat}
        messagesToRender={messagesToRender}
        setReplyingToMessage={memoizedSetReplyingToMessage}
        deleteMessage={memoizedDeleteMessage}
        messageInputRef={messageInputRef}
        isDeletingMessage={isDeletingMessage}
        messages={messages}
        openImageModal={openImageModal}
      />

      <MessageInput
        otherUser={otherUser}
        replyingToMessage={replyingToMessage}
        setReplyingToMessage={memoizedSetReplyingToMessage}
        actualConversationId={actualConversationId}
        currentOptimisticIdRef={currentOptimisticIdRef}
        messageInputRef={messageInputRef}
        sendMessage={sendMessage}
        isSendingMessage={isSendingMessage}
        selectedConversation={selectedConversation}
      />
    </div>
  );
};

export default ChatWindow;
