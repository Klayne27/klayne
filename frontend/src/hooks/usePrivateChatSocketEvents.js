// hooks/messagesHooks/usePrivateChatSocketEvents.js
import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthUser } from "./authHooks/useAuthUser";
import { useSocket } from "../context/SocketContext";

export const usePrivateChatSocketEvents = (
  conversationId,
  messageListRef, // Pass ref for direct DOM access (scrolling)
  didMessageJustLanded, // Pass ref for scroll flag
  setShowNewMessageButton, // Pass setter for button visibility
  setIsTypingOtherUser, // Pass setter for typing status
  otherUser
) => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { authUser: currentUser } = useAuthUser();
  const currentUserId = currentUser?._id;
  const MESSAGE_LIMIT = 40; // Keep consistent with your useFetchMessages

  // These handlers need to be stable across renders
  // If `otherUser` can change frequently within a component's lifetime,
  // then include it in the dependency array. Otherwise, it's fairly stable.

  // Using useCallback for each handler is a good practice here
  // as they are passed to socket.on/off.
  const handleNewMessage = useCallback(
    (newMessage) => {
      // Only process if it's for the currently active conversation OR
      // if it's a new message for a new private chat (where conversationId might be null initially)
      const isForActiveConversation =
        newMessage.conversationId === conversationId ||
        (newMessage.sender._id === otherUser?._id && !conversationId); // For new chats

      if (!isForActiveConversation) return; // Ignore messages not for this chat window

      const targetMessagesQueryKey = ["messages", newMessage.conversationId];

      queryClient.setQueryData(targetMessagesQueryKey, (oldData) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return { pages: [[newMessage]], pageParams: [1] };
        }

        const newData = {
          ...oldData,
          pages: oldData.pages.map((page) => [...page]), // Deep copy pages
        };
        const firstPage = newData.pages[0];

        // Remove any optimistic message if this new message confirms it
        if (newMessage.sender._id.toString() === currentUserId.toString()) {
          const optimisticIndex = firstPage.findIndex(
            (msg) =>
              msg.isOptimistic && msg.sender._id.toString() === currentUserId.toString()
          );
          if (optimisticIndex !== -1) {
            firstPage[optimisticIndex] = newMessage; // Replace optimistic with real
          } else {
            // Fallback: if optimistic not found, ensure no duplicates
            if (!firstPage.some((msg) => msg._id === newMessage._id)) {
              firstPage.push(newMessage);
            }
          }
        } else {
          // Message from other user, just add it if not already present
          if (!firstPage.some((msg) => msg._id === newMessage._id)) {
            firstPage.push(newMessage);
          }
        }

        // Maintain page size integrity (if you are only keeping `MESSAGE_LIMIT` on the first page)
        if (firstPage.length > MESSAGE_LIMIT) {
          firstPage.shift();
        }

        newData.pages[0] = firstPage;
        return newData;
      });

      queryClient.invalidateQueries({ queryKey: ["conversations"] }); // Update sidebar last message/seen status

      // UI-specific logic: Handle scrolling and new message button
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
            didMessageJustLanded.current = true; // Flag for LayoutEffect to scroll
            setShowNewMessageButton(false);
          } else if (newMessage.sender._id.toString() === otherUser?._id.toString()) {
            setShowNewMessageButton(true); // Show button for new messages from other user
          }
        }

        // Mark messages as seen if the other user sent them and we're currently viewing the chat
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
        // Also invalidate conversations to update the seen status in the sidebar
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
      queryClient.invalidateQueries({ queryKey: ["conversations"] }); // Update sidebar
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
      // Update messages cache
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
      // Invalidate conversations to update lastMessage text in sidebar if needed
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
          return [updatedConversation, ...oldConversations]; // Add to the top
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

    console.log(`Joining conversation: ${conversationId}`);
    socket.emit("joinConversation", conversationId);
    socket.emit("userActiveInChat", { conversationId: conversationId }); // Announce user is active
    socket.emit("markMessagesAsSeen", { conversationId: conversationId }); // Mark existing messages seen

    // --- Attach Listeners ---
    socket.on("newMessage", handleNewMessage);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("messagesSeen", handleMessagesSeen);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("messageEdited", handleMessageEdited);
    socket.on("conversationUpdated", handleConversationUpdated);

    // --- Cleanup Function ---
    return () => {
      console.log(`Leaving conversation: ${conversationId}`);
      socket.emit("leaveConversation", conversationId); // Leave the specific conversation room
      socket.emit("userActiveInChat", { conversationId: null }); // Announce user is no longer active in *any* chat
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
    // Note: setActiveConversationId is part of useSocket, which is passed in implicitly by `socket` dependency
    // but the `setActiveConversationId` call at the very top of ChatWindow's useEffect
    // should probably remain there or be moved to a higher-level context if it influences global state.
    // For now, let's keep it in ChatWindow's useEffect or a more global context.
  ]);

  // This hook doesn't return any state that's *managed* by it,
  // it just performs side-effects (socket listening/cache updates).
  // The state it *affects* (typingUsers, showNewMessageButton) is managed
  // by usePrivateChatStore and passed in as setters.
  // So, there's no need to return anything here explicitly.
};
