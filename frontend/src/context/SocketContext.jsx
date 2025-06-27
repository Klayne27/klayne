import { createContext, useState, useEffect, useContext, useRef } from "react";
import io from "socket.io-client";
import { useAuthUser } from "../hooks/authHooks/useAuthUser";
import { useQueryClient } from "@tanstack/react-query";

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5000" : "/";

export const SocketContextProvider = ({ children }) => {
  const { authUser: user, isLoading: isLoadingAuthUser } = useAuthUser();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null); // Keep this state, it's useful

  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [hasNewFeedPosts, setHasNewFeedPosts] = useState(false);

  const socketRef = useRef(null);
  const queryClient = useQueryClient();

  // Use a ref for activeConversationId to prevent re-running the main useEffect
  // when only activeConversationId changes, but still allowing access to its latest value.
  const activeConversationIdRef = useRef(activeConversationId);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (!isLoadingAuthUser && user) {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.offAny();
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }

      const newSocket = io(BASE_URL, {
        query: {
          userId: user._id,
        },
        withCredentials: true,
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      newSocket.on("getOnlineUsers", (users) => {
        setOnlineUsers(users);
      });

      newSocket.on("unreadMessageStatus", ({ hasUnread }) => {
        setHasUnreadMessages(hasUnread);
      });

      newSocket.on("unreadNotificationStatus", ({ hasUnreadNotifications }) => {
        setHasUnreadNotifications(hasUnreadNotifications);
      });

      newSocket.on("newPostAvailable", () => {
        setHasNewFeedPosts(true);
      });

      // --- CRITICAL CHANGE FOR NEW MESSAGES ---
      newSocket.on("newMessage", (newMessage) => {
        // Update the specific conversation's messages cache
        // Use the actual conversationId from the newMessage object

        queryClient.setQueryData(["messages", newMessage.conversationId], (oldData) => {
          if (!oldData) {
            return { pages: [[newMessage]], pageParams: [1] };
          }

          const newData = { ...oldData };
          newData.pages = [...oldData.pages];
          if (newData.pages.length === 0) newData.pages.push([]);

          const firstPageMessages = newData.pages[0].filter((msg) => {
            // If the incoming message has a tempId and matches an existing optimistic message's tempId,
            // filter out the existing optimistic message.
            if (
              newMessage.tempId &&
              msg.tempId === newMessage.tempId &&
              msg.isOptimistic
            ) {
              return false; // Remove the optimistic message
            }
            // Also, prevent true duplicates based on the real _id from the server
            if (msg._id === newMessage._id) {
              return false; // This is a true duplicate, remove the existing one (shouldn't happen with tempId logic but good fallback)
            }
            return true; // Keep other messages
          });

          // Add the new, real message
          newData.pages[0] = [...firstPageMessages, newMessage];
          return newData;
        });

        // Invalidate conversation list to update last message, unread counts, etc.
        queryClient.invalidateQueries(["conversations"]);

        // Optional: If the new message is for the *currently active* chat,
        // and the user is NOT at the bottom, you might want to show a "New Message" button
        // or trigger a subtle scroll. However, your ChatWindow already handles this.
        // We only add the data here; the ChatWindow's useEffects will pick it up.
      });
      // --- END CRITICAL CHANGE ---

      // --- REVISED messageReacted and messageDeleted handlers ---
      // Apply the same principle: target the specific conversation's messages
      newSocket.on("messageReacted", (updatedMessage) => {
        queryClient.setQueryData(
          ["messages", updatedMessage.conversationId], // Target specific conversation
          (oldData) => {
            if (!oldData) return oldData;

            const updatedPages = oldData.pages.map((page) =>
              page.map((message) =>
                message._id === updatedMessage._id ? updatedMessage : message
              )
            );
            return { ...oldData, pages: updatedPages };
          }
        );
        queryClient.invalidateQueries(["conversations", updatedMessage.conversationId]); // More specific invalidation
        queryClient.invalidateQueries(["conversations"]);
      });

      newSocket.on("messageDeleted", ({ messageId, conversationId }) => {
        queryClient.setQueryData(
          ["messages", conversationId], // Target specific conversation
          (oldData) => {
            if (!oldData) return oldData;
            const updatedPages = oldData.pages.map((page) =>
              page.filter((message) => message._id !== messageId)
            );
            return { ...oldData, pages: updatedPages };
          }
        );
        queryClient.invalidateQueries(["conversations", conversationId]); // More specific invalidation
        queryClient.invalidateQueries(["conversations"]);
      });
      // --- END REVISION ---

      newSocket.on("disconnect", (reason) => {
        console.warn(`Socket disconnected: ${reason}`);
      });

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error.message);
      });

      return () => {
        if (newSocket) {
          newSocket.offAny();
          newSocket.disconnect();
          socketRef.current = null;
          setSocket(null);
        }
      };
    } else if (!isLoadingAuthUser && !user) {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.offAny();
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      setOnlineUsers([]);
      setHasUnreadMessages(false);
      setActiveConversationId(null);
      setHasUnreadNotifications(false);
      setHasNewFeedPosts(false);
    }
    // Removed activeConversationId from dependencies to avoid re-initializing socket.
    // Use activeConversationIdRef.current inside the listeners if needed.
  }, [user, isLoadingAuthUser, queryClient]); // Keep only user, isLoadingAuthUser, queryClient as dependencies

  useEffect(() => {
    // This useEffect remains specific to the active chat status
    if (socket && user) {
      socket.emit("userActiveInChat", { conversationId: activeConversationId });
    }
  }, [socket, activeConversationId, user]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        hasUnreadMessages,
        setActiveConversationId,
        hasUnreadNotifications,
        setHasUnreadNotifications,
        hasNewFeedPosts,
        setHasNewFeedPosts,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
