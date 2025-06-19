import { createContext, useState, useEffect, useContext, useRef } from "react";
import io from "socket.io-client";
import { useAuthUser } from "../hooks/authHooks/useAuthUser";

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5000" : "/";

export const SocketContextProvider = ({ children }) => {
  const { authUser: user, isLoading: isLoadingAuthUser } = useAuthUser();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);
  const [lastReceivedMessage, setLastReceivedMessage] = useState(null); // NEW: State to store the last message

  useEffect(() => {
    if (!isLoadingAuthUser && user) {
      const newSocket = io(BASE_URL, {
        query: {
          userId: user._id,
        },
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      newSocket.on("getOnlineUsers", (users) => {
        setOnlineUsers(users);
      });

      newSocket.on("newMessage", (message) => {
        setLastReceivedMessage(message);
        console.log("SocketContext: Received new message:", message);
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
          newSocket.off("newMessage");
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
      setLastReceivedMessage(null);
    }
  }, [user, isLoadingAuthUser]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
