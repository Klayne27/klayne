import { createContext, useState, useEffect, useContext, useRef } from "react";
import io from "socket.io-client";
import { useAuthUser } from "../hooks/authHooks/useAuthUser";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";

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

  const { pathname } = useLocation();

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

      // newSocket.on("newMessage", (newMessage) => {
      //   const targetConversationId = newMessage.conversationId;
      //   const queryKey = ["messages", targetConversationId];

      //   const isMessageForCurrentlyActiveChat =
      //     activeConversationIdRef.current === targetConversationId;

      //   if (isMessageForCurrentlyActiveChat) {
      //     // This is good for updating the active chat
      //     queryClient.setQueryData(queryKey, (oldData) => {
      //       if (!oldData || !oldData.pages || oldData.pages.length === 0) {
      //         return { pages: [[newMessage]], pageParams: [1] };
      //       }
      //       const newData = { ...oldData };
      //       newData.pages = [...oldData.pages];
      //       const mostRecentPageMessages = [...newData.pages[0]].filter((msg) => {
      //         const isOptimisticMatch =
      //           newMessage.tempId && msg.tempId === newMessage.tempId && msg.isOptimistic;
      //         const isIdMatch = msg._id && msg._id === newMessage._id;
      //         return !(isOptimisticMatch || isIdMatch);
      //       });
      //       newData.pages[0] = [...mostRecentPageMessages, newMessage];
      //       return newData;
      //     });
      //   }

      //   // --- REMOVE OR ADJUST THESE LINES ---
      //   // queryClient.invalidateQueries(["conversations"]); // <--- REMOVE THIS
      //   // queryClient.invalidateQueries(["conversations", targetConversationId]); // <--- KEEP IF YOU ABSOLUTELY NEED TO REFECTH THE CONVERSATIONS LIST FOR UNREAD COUNTS, BUT PREFER setQueryData BELOW
      //   // --- END REMOVAL/ADJUSTMENT ---

      //   // Instead of invalidating, consider updating the specific conversation in the list
      //   // This will update the conversation list directly, showing the last message and unread count
      //   queryClient.setQueryData(["conversations"], (oldConversationsData) => {
      //     if (!oldConversationsData) return undefined; // Or return an empty array if that's your initial state

      //     const updatedConversations = oldConversationsData.map((conv) => {
      //       if (conv._id === targetConversationId) {
      //         return {
      //           ...conv,
      //           lastMessage: newMessage,
      //           unreadCount: conv.unreadCount + 1, // Increment unread count
      //         };
      //       }
      //       return conv;
      //     });

      //     // Ensure the updated conversation (with the new message) is at the top/most recent
      //     const updatedConv = updatedConversations.find(
      //       (conv) => conv._id === targetConversationId
      //     );
      //     const otherConvs = updatedConversations.filter(
      //       (conv) => conv._id !== targetConversationId
      //     );
      //     return [updatedConv, ...otherConvs].filter(Boolean); // Filter out potential undefined if not found
      //   });

      //   // Set hasUnreadMessages to true only if the user is not in the active conversation
      //   if (!isMessageForCurrentlyActiveChat) {
      //     setHasUnreadMessages(true);
      //   }
      // });

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
        // --- REMOVE OR ADJUST THESE LINES ---
        // queryClient.invalidateQueries(["conversations", updatedMessage.conversationId]); // <--- KEEP IF NEEDED FOR A SPECIFIC CONVERSATION, BUT PREFER setQueryData
        // queryClient.invalidateQueries(["conversations"]); // <--- REMOVE THIS
        // --- END REMOVAL/ADJUSTMENT ---

        // Similar to newMessage, update the specific conversation in the list directly
        queryClient.setQueryData(["conversations"], (oldConversationsData) => {
          if (!oldConversationsData) return undefined;

          const updatedConversations = oldConversationsData.map((conv) => {
            if (conv._id === updatedMessage.conversationId) {
              // If a reaction, the last message might not change, but you might want to reflect the change
              // For now, we'll just return the conversation as is, as reactions don't change lastMessage often
              return conv;
            }
            return conv;
          });
          return updatedConversations;
        });
      });

      newSocket.on("messageDeleted", ({ messageId, conversationId }) => {
        queryClient.setQueryData(["messages", conversationId], (oldData) => {
          if (!oldData) return oldData;
          const updatedPages = oldData.pages.map((page) =>
            page.filter((message) => message._id !== messageId)
          );
          return { ...oldData, pages: updatedPages };
        });
        // --- REMOVE OR ADJUST THESE LINES ---
        // queryClient.invalidateQueries(["conversations", conversationId]); // <--- KEEP IF NEEDED
        // queryClient.invalidateQueries(["conversations"]); // <--- REMOVE THIS
        // --- END REMOVAL/ADJUSTMENT ---

        // Update the conversation list to reflect the deleted message, e.g., if it was the last message
        queryClient.setQueryData(["conversations"], (oldConversationsData) => {
          if (!oldConversationsData) return undefined;

          const updatedConversations = oldConversationsData.map((conv) => {
            if (conv._id === conversationId) {
              // You'll need to fetch the *actual* new last message for this conversation
              // or handle it more robustly. For now, we'll just leave it as is,
              // assuming the chat view handles the deletion.
              return conv;
            }
            return conv;
          });
          return updatedConversations;
        });
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
  }, [user, isLoadingAuthUser, queryClient]);

  useEffect(() => {
    if (socket && user) {
      socket.emit("userActiveInChat", { conversationId: activeConversationId });
    }
  }, [socket, activeConversationId, user]);

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
        setHasUnreadMessages,
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
