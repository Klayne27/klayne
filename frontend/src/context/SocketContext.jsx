import { createContext, useState, useEffect, useContext, useRef } from "react"
import io from "socket.io-client"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import { useQueryClient } from "@tanstack/react-query"
import { useLocation } from "react-router-dom"
import { messageKeys } from "../features/chat/common/hooks/messageKeys"

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
  const [hasUnreadPublicChat, setHasUnreadPublicChat] = useState(false)
  const [hasNewFeedPosts, setHasNewFeedPosts] = useState(false)

  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [unreadPublicChatCount, setUnreadPublicChatCount] = useState(0)
  const [newPostCount, setNewPostCount] = useState(0)
  const [newICPostCount, setNewICPostCount] = useState(0)
  const [newVentPostCount, setNewVentPostCount] = useState(0)

  const [showNewFeedPostsButton, setShowNewFeedPostsButton] = useState(false)
  const [showNewICPostsButton, setShowNewICPostsButton] = useState(false)
  const [showNewVentPostsButton, setShowNewVentPostsButton] = useState(false)

  const [hasNewICPosts, setHasNewICPosts] = useState(false)
  const [hasNewVentPosts, setHasNewVentPosts] = useState(false)

  const queryClient = useQueryClient()

  const location = useLocation()
  const previousPathRef = useRef(location.pathname)
  const socketRef = useRef(null)
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

      const heartbeatInterval = setInterval(() => {
        if (newSocket.connected) {
          newSocket.emit("heartbeat")
        }
      }, 60 * 1000)

      newSocket.on("getOnlineUsers", (users) => {
        setOnlineUsers(users)
      })

      newSocket.on("unreadMessageStatus", ({ unreadMessageCount }) => {
        setHasUnreadMessages(unreadMessageCount > 0)
        setUnreadMessageCount(unreadMessageCount)
      })

      newSocket.on("unreadNotificationStatus", ({ unreadNotificationsCount }) => {
        setHasUnreadNotifications(unreadNotificationsCount > 0)
        setUnreadNotificationsCount(unreadNotificationsCount)
      })

      newSocket.on("newPostCount", (data) => {
        setShowNewFeedPostsButton(true)
        setNewPostCount(data.newPostCount)
      })

      newSocket.on("newICPostCount", (data) => {
        setShowNewICPostsButton(true)
        setNewICPostCount(data.newICPostCount)
      })

      newSocket.on("newVentPostCount", (data) => {
        setShowNewVentPostsButton(true)
        setNewVentPostCount(data.newVentPostCount)
      })

      newSocket.on("newICUnreadDot", ({ hasNew }) => {
        setHasNewICPosts(hasNew)
      })

      newSocket.on("newVentUnreadDot", ({ hasNew }) => {
        setHasNewVentPosts(hasNew)
      })

      newSocket.on("messageDeleted", ({ messageId, conversationId }) => {
        queryClient.setQueryData(messageKeys.privateMessages(conversationId), (oldData) => {
          if (!oldData) return oldData
          const updatedPages = oldData.pages.map((page) =>
            page.filter((message) => message._id !== messageId),
          )
          return { ...oldData, pages: updatedPages }
        })
      })

      newSocket.on("unreadPublicChatStatus", ({ hasUnreadPublicChat, unreadPublicChatCount }) => {
        setHasUnreadPublicChat(hasUnreadPublicChat)
        setUnreadPublicChatCount(unreadPublicChatCount)
      })

      newSocket.on("publicMessageDeleted", ({ messageId, senderId, text, img }) => {
        queryClient.invalidateQueries({ queryKey: messageKeys.publicMessages() })
      })

      newSocket.on("publicOwnMessageDeleted", ({ messageId, senderId, text, img }) => {
        queryClient.invalidateQueries({ queryKey: messageKeys.publicMessages() })
      })

      newSocket.on("publicMessageReactionUpdated", ({ actorId, updatedMessage }) => {
        if (actorId === user._id) {
          return
        }

        queryClient.setQueryData(messageKeys.publicMessages(), (oldData) => {
          if (!oldData) return oldData

          const updatedPages = oldData.pages.map((page) =>
            page.map((message) => {
              if (message._id === updatedMessage._id) {
                return { ...message, reactions: updatedMessage.reactions }
              }
              return message
            }),
          )
          return { ...oldData, pages: updatedPages }
        })
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
      setShowNewICPostsButton(false)
      setShowNewFeedPostsButton(false)
      setHasUnreadPublicChat(false)
      setUnreadNotificationsCount(0)
      setUnreadMessageCount(0)
      setNewPostCount(0)
      setNewICPostCount(0)
      setUnreadPublicChatCount(0)
      setNewVentPostCount(0)
      setHasNewICPosts(false)
      setHasNewVentPosts(false)
    }
  }, [user, isLoadingAuthUser, queryClient])

  useEffect(() => {
    if (!socket || !user) return

    const currentPath = location.pathname
    const prevPath = previousPathRef.current

    if (currentPath === PUBLIC_CHAT_ROUTE && prevPath !== PUBLIC_CHAT_ROUTE) {
      socket.emit("userEnteredPublicChat")
      setHasUnreadPublicChat(false)
    } else if (currentPath !== PUBLIC_CHAT_ROUTE && prevPath === PUBLIC_CHAT_ROUTE) {
      socket.emit("userLeftPublicChat")
    }

    previousPathRef.current = currentPath
  }, [socket, user, location.pathname])

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        
        hasUnreadMessages,
        setHasUnreadMessages,
        hasUnreadNotifications,
        setHasUnreadNotifications,
        hasNewFeedPosts,
        setHasNewFeedPosts,
        showNewFeedPostsButton,
        setShowNewFeedPostsButton,
        hasUnreadPublicChat,
        setHasUnreadPublicChat,

        showNewVentPostsButton,
        setShowNewVentPostsButton,
        showNewICPostsButton,
        setShowNewICPostsButton,
        hasNewICPosts,
        setHasNewICPosts,
        hasNewVentPosts,
        setHasNewVentPosts,

        setActiveConversationId,
        newPostCount,
        newICPostCount,
        newVentPostCount,
        unreadNotificationsCount,
        unreadMessageCount,
        unreadPublicChatCount,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}
