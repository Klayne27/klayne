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

  const [hasUnreadMessages, setHasUnreadMessages] = useState(false); // New state for unread messages
  const socketRef = useRef(null);
  const queryClient = useQueryClient(); // Initialize useQueryClient

  useEffect(() => {
    if (!isLoadingAuthUser && user) {
      const newSocket = io(BASE_URL, {
        query: {
          userId: user._id,
        },
        withCredentials: true, // Important for sending cookies if you use them for auth
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      newSocket.on("getOnlineUsers", (users) => {
        setOnlineUsers(users);
      });

      // Listen for the new unreadMessageStatus event
      newSocket.on("unreadMessageStatus", ({ hasUnread }) => {
        setHasUnreadMessages(hasUnread);
      });

      // --- NEW: Add global newMessage listener here ---
      newSocket.on("newMessage", (newMessage) => {
        console.log("SocketContext: Received new message globally:", newMessage);
        // Invalidate the conversations list query whenever ANY new message arrives
        // This will cause components using useQuery(['conversations']) to refetch.
        queryClient.invalidateQueries(["conversations"]);

        // OPTIONAL: If you want to update the message list in an *active* chat
        // from here, you would add logic like the one in ChatWindow.jsx
        // But for simplicity and separation of concerns, ChatWindow handles its own list.
      });

      newSocket.on("disconnect", (reason) => {
        console.warn(`Socket disconnected: ${reason}`);
        // When disconnected, assume no unread messages until reconnected
        setHasUnreadMessages(false);
      });

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error.message);
        setHasUnreadMessages(false);
      });

      return () => {
        if (newSocket) {
          newSocket.off("getOnlineUsers");
          newSocket.off("unreadMessageStatus"); // Clean up listener
          newSocket.off("newMessage"); // Clean up the new listener
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
      setHasUnreadMessages(false); // No user, no unread messages
      setActiveConversationId(null); // Reset active conversation on logout
    }
  }, [user, isLoadingAuthUser, queryClient]);

  // NEW useEffect: Emit active conversation ID to the backend
  useEffect(() => {
    if (socket && user) {
      // Emit the current activeConversationId. It will be null if no chat is open.

      socket.emit("userActiveInChat", { conversationId: activeConversationId });
    }
  }, [socket, activeConversationId, user]); // Re-run when these dependencies change

  return (
    <SocketContext.Provider
      value={{ socket, onlineUsers, hasUnreadMessages, setActiveConversationId }}
    >
      {children}
    </SocketContext.Provider>
  );
};
