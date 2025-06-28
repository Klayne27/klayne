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

      newSocket.on("newMessage", (newMessage) => {
        const targetConversationId = newMessage.conversationId;
        const queryKey = ["messages", targetConversationId];

        const isMessageForCurrentlyActiveChat =
          activeConversationIdRef.current === targetConversationId;

        if (isMessageForCurrentlyActiveChat) {
          queryClient.setQueryData(queryKey, (oldData) => {
            if (!oldData || !oldData.pages || oldData.pages.length === 0) {
              return { pages: [[newMessage]], pageParams: [1] };
            }

            const newData = { ...oldData };
            newData.pages = [...oldData.pages]; // Ensure immutability

            // Assuming pages[0] is the most recent page in your flatMap
            const mostRecentPageMessages = [...newData.pages[0]].filter((msg) => {
              // Filter out optimistic message if this new message is its server-confirmed version (using tempId if available)
              // Note: newMessage from socket usually won't have tempId, but good to be defensive
              if (
                newMessage.tempId &&
                msg.tempId === newMessage.tempId &&
                msg.isOptimistic
              ) {
                return false;
              }
              // Filter out exact duplicates by _id (shouldn't happen with server-assigned unique IDs, but defensive)
              if (msg._id === newMessage._id) {
                return false;
              }
              return true;
            });

            newData.pages[0] = [...mostRecentPageMessages, newMessage];
            return newData;
          });

          // After immediate UI update, invalidate for a background refetch
          // This ensures full consistency with the server's data without blocking.
          queryClient.invalidateQueries({
            queryKey,
            exact: true,
            refetchType: "background", // Triggers refetch but doesn't block UI
          });
        } else {
          // If message is for an inactive chat, just invalidate.
          // This ensures a fresh fetch when that chat is opened later, preventing flicker.
          queryClient.invalidateQueries({ queryKey, exact: true });
        }

        // Always invalidate conversations for sidebar updates (unread counts, last message)
        queryClient.invalidateQueries(["conversations"]);
      });

      newSocket.on("messageReacted", (updatedMessage) => {
        queryClient.setQueryData(
          ["messages", updatedMessage.conversationId],
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
        queryClient.invalidateQueries(["conversations", updatedMessage.conversationId]);
        queryClient.invalidateQueries(["conversations"]);
      });

      newSocket.on("messageDeleted", ({ messageId, conversationId }) => {
        queryClient.setQueryData(["messages", conversationId], (oldData) => {
          if (!oldData) return oldData;
          const updatedPages = oldData.pages.map((page) =>
            page.filter((message) => message._id !== messageId)
          );
          return { ...oldData, pages: updatedPages };
        });
        queryClient.invalidateQueries(["conversations", conversationId]);
        queryClient.invalidateQueries(["conversations"]);
      });

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
