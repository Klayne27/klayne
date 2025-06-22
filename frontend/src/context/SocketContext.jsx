import { createContext, useState, useEffect, useContext, useRef } from "react";
import io from "socket.io-client";
import { useAuthUser } from "../hooks/authHooks/useAuthUser";
import { useQueryClient } from "@tanstack/react-query";

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

// Use the environment variable directly. Ensure VITE_BACKEND_URL is set
// correctly in your .env.development and .env.production files.
// For example:
// .env.development: VITE_BACKEND_URL=http://localhost:5000
// .env.production: VITE_BACKEND_URL=https://your-production-backend.com
// If your backend is proxied to "/" in production, then your current logic `"/ "` is fine.
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
    // Only attempt to establish a socket connection if authentication is loaded
    // and a user is present.
    if (!isLoadingAuthUser && user) {
      // --- IMPORTANT FOR BFCACHE / PREVENTING MULTIPLE CONNECTIONS ---
      // If a socket instance already exists from a previous render/login,
      // or if hot module reloading occurred, disconnect it cleanly first.
      if (socketRef.current && socketRef.current.connected) {
        console.log(
          "SocketContext: Disconnecting existing socket before new connection."
        );
        socketRef.current.offAny(); // Remove all listeners from the old socket
        socketRef.current.disconnect(); // Cleanly disconnect the old socket
        socketRef.current = null; // Clear the ref
        setSocket(null); // Clear the state
      }

      const newSocket = io(BASE_URL, {
        query: {
          userId: user._id,
        },
        withCredentials: true,
      });

      socketRef.current = newSocket; // Store the new socket in the ref
      setSocket(newSocket); // Update state to make it available to consumers

      // --- Socket Event Listeners ---
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
        console.log("Received newPostAvailable event. Setting hasNewFeedPosts to true.");
        setHasNewFeedPosts(true);
      });

      newSocket.on("newMessage", (newMessage) => {
        queryClient.invalidateQueries(["conversations"]);
        // Optional: If the new message is for the currently active conversation,
        // you might also want to invalidate the 'messages' query for that conversation.
        // if (activeConversationId && newMessage.conversation === activeConversationId) {
        //   queryClient.invalidateQueries(["messages", activeConversationId]);
        // }
      });

      // It's generally better not to reset states like hasUnreadMessages
      // on every disconnect/connect_error, as these can be transient network issues.
      // Resetting them should probably be tied to explicit actions (e.g., user marking as read)
      // or more robust online/offline detection if you have it.
      newSocket.on("disconnect", (reason) => {
        console.warn(`Socket disconnected: ${reason}`);
        // setHasUnreadMessages(false); // Consider if this is truly desired here
      });

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error.message);
        // setHasUnreadMessages(false); // Consider if this is truly desired here
      });

      // --- CRITICAL CLEANUP FOR BFCACHE ---
      // This return function runs when the component unmounts (e.g., user navigates away,
      // closes tab, or the component re-renders and the effect needs to be re-run).
      return () => {
        if (newSocket) {
          console.log(
            "SocketContext cleanup: Disconnecting socket for BFcache eligibility."
          );
          // Remove all listeners to prevent memory leaks.
          // This is more robust than individual .off() calls.
          newSocket.offAny();

          // Use .disconnect() for a clean termination of the Socket.IO session.
          // This sends a disconnect packet to the server before closing the transport,
          // which is preferred over .close() for Socket.IO.
          newSocket.disconnect();

          // Optionally, clear the ref and state immediately for clarity
          socketRef.current = null;
          setSocket(null);
        }
      };
    } else if (!isLoadingAuthUser && !user) {
      // --- Logout/No User Handling ---
      // If there's no authenticated user, ensure any existing socket is closed.
      if (socketRef.current && socketRef.current.connected) {
        console.log("SocketContext: User logged out. Disconnecting existing socket.");
        socketRef.current.offAny();
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      // Reset all related states when user logs out
      setOnlineUsers([]);
      setHasUnreadMessages(false);
      setActiveConversationId(null);
      setHasUnreadNotifications(false);
      setHasNewFeedPosts(false);
    }
  }, [user, isLoadingAuthUser, queryClient]); // Dependencies for this useEffect

  // This useEffect handles emitting the 'userActiveInChat' event.
  // It ensures the event is sent whenever the socket, active conversation, or user changes.
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
