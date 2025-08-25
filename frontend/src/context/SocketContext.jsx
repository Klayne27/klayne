import { createContext, useState, useEffect, useContext, useRef } from "react"
import io from "socket.io-client"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import { useQueryClient } from "@tanstack/react-query"
import { useLocation } from "react-router-dom"
import { messageKeys } from "../features/chat/private/privateChatHooks/messageKeys"

const SocketContext = createContext()

export const useSocket = () => {
  return useContext(SocketContext)
}

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5000" : "/"
const PUBLIC_CHAT_ROUTE = "/public-chat"

export const SocketContextProvider = ({ children }) => {
  const { authUser: user, isLoading: isLoadingAuthUser } = useAuthUser()
  const [socket, setSocket] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)

  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false)
  const [hasNewFeedPosts, setHasNewFeedPosts] = useState(false)
  const [showNewFeedPostsButton, setShowNewFeedPostsButton] = useState(false)
  const [hasUnreadPublicChat, setHasUnreadPublicChat] = useState(false)
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [unreadPublicChatCount, setUnreadPublicChatCount] = useState(0)
  const [newPostCount, setNewPostCount] = useState(0)

  const socketRef = useRef(null)
  const queryClient = useQueryClient()

  const location = useLocation()
  const previousPathRef = useRef(location.pathname)

  const activeConversationIdRef = useRef(activeConversationId)
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId
  }, [activeConversationId])

  useEffect(() => {
    if (!isLoadingAuthUser && user) {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.offAny()
        socketRef.current.disconnect()
        socketRef.current = null
        setSocket(null)
      }

      const newSocket = io(BASE_URL, {
        query: {
          userId: user._id,
        },
        withCredentials: true,
      })

      socketRef.current = newSocket
      setSocket(newSocket)

      // In SocketContextProvider.jsx
      // newSocket.on("newPublicMessage", (newMessage) => {
      //   queryClient.invalidateQueries({ queryKey: messageKeys.publicMessages() })
      // })

      const heartbeatInterval = setInterval(() => {
        if (newSocket.connected) {
          newSocket.emit("heartbeat")
        }
      }, 60 * 1000) // Send heartbeat every 1 minute

      newSocket.on("publicMessageDeleted", ({ messageId, senderId, text, img }) => {
        queryClient.invalidateQueries({ queryKey: messageKeys.publicMessages() })
      })

      newSocket.on("publicOwnMessageDeleted", ({ messageId, senderId, text, img }) => {
        queryClient.invalidateQueries({ queryKey: messageKeys.publicMessages() })
      })

      newSocket.on("getOnlineUsers", (users) => {
        setOnlineUsers(users)
      })

      newSocket.on("unreadMessageStatus", ({ hasUnread, unreadMessageCount }) => {
        setHasUnreadMessages(unreadMessageCount > 0)
        setUnreadMessageCount(unreadMessageCount)
      })

      newSocket.on(
        "unreadNotificationStatus",
        ({ hasUnreadNotifications, unreadNotificationsCount }) => {
          setHasUnreadNotifications(unreadNotificationsCount > 0)
          setUnreadNotificationsCount(unreadNotificationsCount)
        },
      )

      newSocket.on("newPostCount", (data) => {
        // setHasNewFeedPosts(true);
        setShowNewFeedPostsButton(true)
        setNewPostCount(data.newPostCount)
      })

      // newSocket.on("messageReacted", ({ actorId, updatedMessage }) => {
      //   if (actorId === user._id) {
      //     return;
      //   }

      //   queryClient.setQueryData(
      //     ["messages", updatedMessage.conversationId],
      //     (oldData) => {
      //       if (!oldData) return oldData;
      //       const updatedPages = oldData.pages.map((page) =>
      //         page.map((message) =>
      //           message._id === updatedMessage._id ? updatedMessage : message
      //         )
      //       );
      //       return { ...oldData, pages: updatedPages };
      //     }
      //   );
      // });

      newSocket.on("publicMessageReactionUpdated", ({ actorId, updatedMessage }) => {
        if (actorId === user._id) {
          return // Ignore updates from self for reactions to prevent flicker
        }

        // Apply the update for reactions from other users, or if actorId is not provided
        queryClient.setQueryData(messageKeys.publicMessages(), (oldData) => {
          if (!oldData) return oldData

          const updatedPages = oldData.pages.map((page) =>
            page.map((message) => {
              if (message._id === updatedMessage._id) {
                // Use updatedMessage._id
                return { ...message, reactions: updatedMessage.reactions } // Use reactions from updatedMessage
              }
              return message
            }),
          )
          return { ...oldData, pages: updatedPages }
        })
      })

      newSocket.on("messageDeleted", ({ messageId, conversationId }) => {
        queryClient.setQueryData(messageKeys.privateMessages(conversationId), (oldData) => {
          if (!oldData) return oldData
          const updatedPages = oldData.pages.map((page) =>
            page.filter((message) => message._id !== messageId),
          )
          return { ...oldData, pages: updatedPages }
        })

        // queryClient.setQueryData(["conversations"], (oldConversationsData) => {
        //   if (!oldConversationsData) return undefined;
        //   const updatedConversations = oldConversationsData.map((conv) => {
        //     if (conv._id === conversationId) {
        //       return conv;
        //     }
        //     return conv;
        //   });
        //   return updatedConversations;
        // });
      })

      newSocket.on("unreadPublicChatStatus", ({ hasUnreadPublicChat, unreadPublicChatCount }) => {
        setHasUnreadPublicChat(hasUnreadPublicChat)
        setUnreadPublicChatCount(unreadPublicChatCount)
      })

      newSocket.on("disconnect", (reason) => {
        console.warn(`Socket disconnected: ${reason}`)
      })

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error.message)
      })

      return () => {
        if (newSocket) {
          newSocket.offAny()
          newSocket.disconnect()
          socketRef.current = null
          setSocket(null)
          clearInterval(heartbeatInterval)
        }
      }
    } else if (!isLoadingAuthUser && !user) {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.offAny()
        socketRef.current.disconnect()
        socketRef.current = null
        setSocket(null)
      }
      setOnlineUsers([])
      setHasUnreadMessages(false)
      setActiveConversationId(null)
      setHasUnreadNotifications(false)
      setHasNewFeedPosts(false)
      setShowNewFeedPostsButton(false)
      setHasUnreadPublicChat(false) // Clear public chat unread status on logout
      setUnreadNotificationsCount(0)
      setUnreadMessageCount(0)
      setNewPostCount(0)
      setUnreadPublicChatCount(0)
    }
  }, [user, isLoadingAuthUser, queryClient])

  useEffect(() => {
    // This existing useEffect updates `activeConversationIdRef` based on `activeConversationId` state.
    // It's fine as is for private chats.
  }, [activeConversationId])

  // ✅ This effect now correctly manages enter/leave events
  useEffect(() => {
    if (!socket || !user) return

    const currentPath = location.pathname
    const prevPath = previousPathRef.current // When user ENTERS the public chat

    if (currentPath === PUBLIC_CHAT_ROUTE && prevPath !== PUBLIC_CHAT_ROUTE) {
      socket.emit("userEnteredPublicChat")
      setHasUnreadPublicChat(false)
    } // When user LEAVES the public chat
    else if (currentPath !== PUBLIC_CHAT_ROUTE && prevPath === PUBLIC_CHAT_ROUTE) {
      socket.emit("userLeftPublicChat")
    }

    previousPathRef.current = currentPath
  }, [socket, user, location.pathname])

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
        showNewFeedPostsButton,
        setShowNewFeedPostsButton,
        hasUnreadPublicChat,
        setHasUnreadPublicChat,
        unreadNotificationsCount,
        unreadMessageCount,
        unreadPublicChatCount,
        newPostCount,
        setNewPostCount,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}
