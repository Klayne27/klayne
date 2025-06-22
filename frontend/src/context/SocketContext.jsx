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
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false); // NEW STATE
  const [hasNewFeedPosts, setHasNewFeedPosts] = useState(false);

  const socketRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoadingAuthUser && user) {
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

      // NEW LISTENER: Listen for unread notification status
      newSocket.on("unreadNotificationStatus", ({ hasUnreadNotifications }) => {
        setHasUnreadNotifications(hasUnreadNotifications);
      });

      // ****** NEW LISTENER FOR NEW POSTS ******
      newSocket.on("newPostAvailable", () => {
        console.log("Received newPostAvailable event. Setting hasNewFeedPosts to true.");
        setHasNewFeedPosts(true);
      });

      newSocket.on("newMessage", (newMessage) => {
        queryClient.invalidateQueries(["conversations"]);
      });

      newSocket.on("disconnect", (reason) => {
        console.warn(`Socket disconnected: ${reason}`);
        setHasUnreadMessages(false);
      });

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error.message);
        setHasUnreadMessages(false);
      });

      return () => {
        if (newSocket) {
          newSocket.off("getOnlineUsers");
          newSocket.off("unreadMessageStatus");
          newSocket.off("unreadNotificationStatus");
          newSocket.off("newMessage");
          newSocket.off("newPostAvailable");
          newSocket.off("disconnect");
          newSocket.off("connect_error");
          newSocket.close();
        }
      };
    } else if (!isLoadingAuthUser && !user) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
      }
      setOnlineUsers([]);
      setHasUnreadMessages(false);
      setActiveConversationId(null);
      setHasUnreadNotifications(false);
      setHasNewFeedPosts(false);
    }
  }, [user, isLoadingAuthUser, queryClient]);

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
