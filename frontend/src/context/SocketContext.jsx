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
  const [activeConversationId, setActiveConversationId] = useState(null);

  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [hasNewFeedPosts, setHasNewFeedPosts] = useState(false);

  const socketRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoadingAuthUser && user) {
      if (socketRef.current && socketRef.current.connected) {
        console.log(
          "SocketContext: Disconnecting existing socket before new connection."
        );
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
        // This logic is for new messages. We need a similar one for reactions.
        // If the new message is for the currently active conversation, we update messages query.
        // Otherwise, we just invalidate conversations to update unread counts etc.
        if (activeConversationId && newMessage.conversationId === activeConversationId) {
          queryClient.setQueryData(["messages"], (oldData) => {
            if (oldData) {
              // Assuming messages are in pages, add to the first page
              const updatedPages = oldData.pages.map((page, index) =>
                index === 0 ? [...page, newMessage] : page
              );
              return { ...oldData, pages: updatedPages };
            }
            return { pages: [[newMessage]] };
          });
        }
        queryClient.invalidateQueries(["conversations"]);
      });

      // NEW: Handle messageReacted event
      newSocket.on("messageReacted", (updatedMessage) => {
        queryClient.setQueryData(["messages"], (oldData) => {
          if (!oldData) return oldData; // If no old data, do nothing

          const updatedPages = oldData.pages.map((page) =>
            page.map((message) =>
              message._id === updatedMessage._id ? updatedMessage : message
            )
          );
          return { ...oldData, pages: updatedPages };
        });
        // Invalidate conversations to potentially update lastMessage.seen status if a reaction was on it
        // and it affected the seen status. Though typically reactions don't change seen status,
        // it's good practice for general message updates.
        queryClient.invalidateQueries(["conversations"]);
      });

      // NEW: Handle messageDeleted event
      newSocket.on("messageDeleted", ({ messageId, conversationId }) => {
        queryClient.setQueryData(["messages"], (oldData) => {
          if (!oldData) return oldData;
          const updatedPages = oldData.pages.map((page) =>
            page.filter((message) => message._id !== messageId)
          );
          return { ...oldData, pages: updatedPages };
        });
        // Invalidate conversations to ensure lastMessage updates if the deleted message was the last one
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
          console.log(
            "SocketContext cleanup: Disconnecting socket for BFcache eligibility."
          );
          newSocket.offAny();

          newSocket.disconnect();

          socketRef.current = null;
          setSocket(null);
        }
      };
    } else if (!isLoadingAuthUser && !user) {
      if (socketRef.current && socketRef.current.connected) {
        console.log("SocketContext: User logged out. Disconnecting existing socket.");
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
  }, [user, isLoadingAuthUser, queryClient, activeConversationId]); // activeConversationId added to dependency array

  useEffect(() => {
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
