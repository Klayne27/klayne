// src/context/SocketContext.jsx

import React, { createContext, useState, useEffect, useContext, useRef } from "react";
import io from "socket.io-client";
import { useAuthUser } from "../hooks/authHooks/useAuthUser";

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketContextProvider = ({ children }) => {
  const { authUser: user, isLoading: isLoadingAuthUser } = useAuthUser(); // <--- Use authUser from your hook
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    // Only proceed if authUser data is loaded and available
    if (!isLoadingAuthUser && user) {
      // <--- Check isLoadingAuthUser
      const newSocket = io("http://localhost:5000", {
        query: {
          userId: user._id,
        },
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      newSocket.on("getOnlineUsers", (users) => {
        setOnlineUsers(users);
      });

      newSocket.on("disconnect", (reason) => {
        console.warn(`Socket disconnected: ${reason}`);
      });

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error.message);
      });

      return () => {
        if (newSocket) {
          newSocket.off("getOnlineUsers");
          newSocket.off("disconnect");
          newSocket.off("connect_error");
          newSocket.close();
        }
      };
    } else if (!isLoadingAuthUser && !user) {
      // If auth data loaded but no user (logged out)
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
      }
      setOnlineUsers([]);
    }
  }, [user, isLoadingAuthUser]); // <--- Add isLoadingAuthUser to dependency array

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
