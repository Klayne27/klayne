import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthUser } from "./authHooks/useAuthUser";
import { useSocket } from "../context/SocketContext";

export const usePrivateChatSocketEvents = (
  conversationId,
  messageListRef,
  didMessageJustLanded,
  setShowNewMessageButton,
  setIsTypingOtherUser,
  otherUser
) => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { authUser: currentUser } = useAuthUser();
  const currentUserId = currentUser?._id;
  const MESSAGE_LIMIT = 40;

  const handleNewMessage = useCallback(
    (newMessage) => {
      const isForActiveConversation =
        newMessage.conversationId === conversationId ||
        (newMessage.sender._id === otherUser?._id && !conversationId);

      if (!isForActiveConversation) return;

      const targetMessagesQueryKey = ["messages", newMessage.conversationId];

      queryClient.setQueryData(targetMessagesQueryKey, (oldData) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return { pages: [[newMessage]], pageParams: [1] };
        }

        const newData = {
          ...oldData,
          pages: oldData.pages.map((page) => [...page]), 
        };
        const firstPage = newData.pages[0];

        if (newMessage.sender._id.toString() === currentUserId.toString()) {
          const optimisticIndex = firstPage.findIndex(
            (msg) =>
              msg.isOptimistic && msg.sender._id.toString() === currentUserId.toString()
          );
          if (optimisticIndex !== -1) {
            firstPage[optimisticIndex] = newMessage;
          } else {
            if (!firstPage.some((msg) => msg._id === newMessage._id)) {
              firstPage.push(newMessage);
            }
          }
        } else {
          if (!firstPage.some((msg) => msg._id === newMessage._id)) {
            firstPage.push(newMessage);
          }
        }

        if (firstPage.length > MESSAGE_LIMIT) {
          firstPage.shift();
        }

        newData.pages[0] = firstPage;
        return newData;
      });

      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      if (isForActiveConversation) {
        const listEl = messageListRef.current;
        if (listEl) {
          const scrollThreshold = 100;
          const isAtBottom =
            listEl.scrollHeight - listEl.scrollTop <=
            listEl.clientHeight + scrollThreshold;

          if (
            newMessage.sender._id.toString() === currentUserId.toString() ||
            isAtBottom
          ) {
            didMessageJustLanded.current = true;
            setShowNewMessageButton(false);
          } else if (newMessage.sender._id.toString() === otherUser?._id.toString()) {
            setShowNewMessageButton(true);
          }
        }

        if (newMessage.sender._id.toString() === otherUser?._id.toString()) {
          socket.emit("markMessagesAsSeen", {
            conversationId: newMessage.conversationId,
          });
        }
      }
    },
    [
      conversationId,
      queryClient,
      currentUserId,
      otherUser,
      messageListRef,
      didMessageJustLanded,
      setShowNewMessageButton,
      socket,
      MESSAGE_LIMIT,
    ]
  );

  const handleMessagesSeen = useCallback(
    ({ conversationId: seenConversationId, readerId }) => {
      if (seenConversationId.toString() === conversationId?.toString()) {
        queryClient.setQueryData(["messages", conversationId], (oldData) => {
          if (!oldData) return oldData;
          const updatedPages = oldData.pages.map((page) =>
            page.map((msg) =>
              msg.sender &&
              msg.sender._id.toString() === currentUserId.toString() &&
              !msg.seen
                ? { ...msg, seen: true }
                : msg
            )
          );
          return { ...oldData, pages: updatedPages };
        });
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
    },
    [conversationId, queryClient, currentUserId]
  );

  const handleMessageDeleted = useCallback(
    ({ messageId, conversationId: deletedConversationId }) => {
      if (deletedConversationId.toString() === conversationId?.toString()) {
        queryClient.setQueryData(["messages", conversationId], (oldData) => {
          if (!oldData) return oldData;
          const updatedPages = oldData.pages.map((page) =>
            page.filter((msg) => msg._id !== messageId)
          );
          return { ...oldData, pages: updatedPages };
        });
      }
      queryClient.invalidateQueries({ queryKey: ["conversations"] }); 
    },
    [conversationId, queryClient]
  );

  const handleTyping = useCallback(
    ({ conversationId: typingConvId, userId, isEditing }) => {
      if (typingConvId === conversationId && userId === otherUser?._id.toString()) {
        setIsTypingOtherUser(true);
      }
    },
    [conversationId, otherUser?._id, setIsTypingOtherUser]
  );

  const handleStopTyping = useCallback(
    ({ conversationId: stopTypingConvId, userId, isEditing }) => {
      if (stopTypingConvId === conversationId && userId === otherUser?._id.toString()) {
        setIsTypingOtherUser(false);
      }
    },
    [conversationId, otherUser?._id, setIsTypingOtherUser]
  );

  const handleMessageEdited = useCallback(
    (updatedMessage) => {
      if (updatedMessage.conversationId.toString() === conversationId?.toString()) {
        queryClient.setQueryData(["messages", conversationId], (oldData) => {
          if (!oldData) return oldData;
          const updatedPages = oldData.pages.map((page) =>
            page.map((msg) => {
              if (msg._id === updatedMessage._id) return updatedMessage;
              if (msg.repliedTo && msg.repliedTo._id === updatedMessage._id) {
                return { ...msg, repliedTo: updatedMessage };
              }
              return msg;
            })
          );
          return { ...oldData, pages: updatedPages };
        });
      }
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    [conversationId, queryClient]
  );

  const handleConversationUpdated = useCallback(
    (updatedConversation) => {
      queryClient.setQueryData(["conversations"], (oldConversations) => {
        if (!oldConversations) return [updatedConversation];
        const index = oldConversations.findIndex(
          (conv) => conv._id === updatedConversation._id
        );
        if (index !== -1) {
          const newConversations = [...oldConversations];
          newConversations[index] = updatedConversation;
          return newConversations;
        } else {
          return [updatedConversation, ...oldConversations];
        }
      });
    },
    [queryClient]
  );

  useEffect(() => {
    if (!socket || !conversationId) {
      console.log(
        "Socket or conversationId not available for private chat, skipping setup."
      );
      return;
    }

    socket.emit("joinConversation", conversationId);
    socket.emit("userActiveInChat", { conversationId: conversationId });
    socket.emit("markMessagesAsSeen", { conversationId: conversationId }); 

    socket.on("newMessage", handleNewMessage);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("messagesSeen", handleMessagesSeen);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("messageEdited", handleMessageEdited);
    socket.on("conversationUpdated", handleConversationUpdated);

    return () => {
      socket.emit("leaveConversation", conversationId);
      socket.emit("userActiveInChat", { conversationId: null });
      socket.off("newMessage", handleNewMessage);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("messagesSeen", handleMessagesSeen);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.off("messageEdited", handleMessageEdited);
      socket.off("conversationUpdated", handleConversationUpdated);
    };
  }, [
    socket,
    conversationId,
    handleNewMessage,
    handleMessageDeleted,
    handleMessagesSeen,
    handleTyping,
    handleStopTyping,
    handleMessageEdited,
    handleConversationUpdated,
  ]);
};
