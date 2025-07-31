// hooks/usePublicChatSocketEvents.js
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthUser } from "./authHooks/useAuthUser";
import { useSocket } from "../context/SocketContext";

export const usePublicChatSocketEvents = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { authUser } = useAuthUser(); // Get authUser if needed for optimistic updates/sender checks

  // State for typing users (if you want this managed by the socket hook)
  const [typingUsers, setTypingUsers] = useState([]); // Or pass setTypingUsers from parent

  useEffect(() => {
    if (!socket || !authUser) return; // Ensure socket and user are available

    socket.emit("public_chat_room"); // Join the room when this hook mounts

    const handleNewPublicMessage = (newMessage) => {
      queryClient.setQueryData(["publicMessages"], (oldData) => {
        // ... (your existing logic for handleNewPublicMessage) ...
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return { pages: [[newMessage]], pageParams: [1] };
        }

        const newPages = oldData.pages.map((page) => [...page]);
        const mostRecentPage = newPages[0];

        if (newMessage.sender._id === authUser._id) {
          const optimisticIndex = mostRecentPage.findIndex((msg) => msg.isOptimistic);
          if (optimisticIndex !== -1) {
            mostRecentPage[optimisticIndex] = newMessage;
          } else {
            if (!mostRecentPage.some((msg) => msg._id === newMessage._id)) {
              mostRecentPage.push(newMessage);
            }
          }
        } else {
          if (!mostRecentPage.some((msg) => msg._id === newMessage._id)) {
            mostRecentPage.push(newMessage);
          }
        }
        return { ...oldData, pages: newPages };
      });
    };

    const handleMessageDeleted = ({ messageId }) => {
      // ... (your existing logic for handleMessageDeleted) ...
      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData) return oldData;
        const updatedPages = oldData.pages.map((page) =>
          page.map((message) => {
            if (message._id === messageId) {
              return {
                ...message,
                isDeletedByAdmin: true,
                img: null,
              };
            }
            if (message.replyTo && message.replyTo._id === messageId) {
              return {
                ...message,
                replyTo: {
                  ...message.replyTo,
                  img: null,
                  isDeletedByAdmin: true,
                  isOriginalMessageDeleted: true,
                },
              };
            }
            return message;
          })
        );
        return { ...oldData, pages: updatedPages };
      });
    };

    const handlepublicOwnMessageDeleted = ({ messageId }) => {
      // ... (your existing logic for handlepublicOwnMessageDeleted) ...
      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData) return oldData;
        const updatedPages = oldData.pages.map((page) => {
          return page.map((message) => {
            if (message._id === messageId) {
              return {
                ...message,
                isDeletedByUser: true,
                img: null,
              };
            }
            if (message.replyTo && message.replyTo._id === messageId) {
              return {
                ...message,
                replyTo: {
                  ...message.replyTo,
                  img: null,
                  isDeletedByUser: true,
                  isOriginalMessageDeleted: true,
                },
              };
            }
            return message;
          });
        });
        return { ...oldData, pages: updatedPages };
      });
    };

    const handlePublicMessageEdited = (updatedMessage) => {
      // ... (your existing logic for handlePublicMessageEdited) ...
      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData || !oldData.pages) {
          return oldData;
        }
        const updatedPages = oldData.pages.map((page) =>
          page.map((msg) => {
            if (msg._id == updatedMessage._id) {
              return updatedMessage;
            }
            if (msg.replyTo && msg.replyTo._id === updatedMessage._id) {
              return {
                ...msg,
                replyTo: updatedMessage,
              };
            }
            return msg;
          })
        );
        return { ...oldData, pages: updatedPages };
      });
    };

    const handlePublicMessageReactionUpdated = ({ messageId, reactions }) => {
      // ... (your existing logic for handlePublicMessageReactionUpdated) ...
      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData) return oldData;

        const updatedPages = oldData.pages.map((page) =>
          page.map((message) => {
            if (message._id === messageId) {
              return { ...message, reactions: reactions };
            }
            return message;
          })
        );
        return { ...oldData, pages: updatedPages };
      });
    };

    const handleUserBannedGlobal = ({ userId, username }) => {
      queryClient.invalidateQueries({ queryKey: ["publicMessages"] });
    };

    const handleUserUnbannedGlobal = ({ userId, username }) => {
      queryClient.invalidateQueries({ queryKey: ["publicMessages"] });
    };

    const handlePublicTypingUpdate = ({ typingUsers: serverTypingUsers }) => {
      setTypingUsers(serverTypingUsers.filter((user) => user.userId !== authUser._id));
    };

    socket.on("newPublicMessage", handleNewPublicMessage);
    socket.on("publicMessageDeleted", handleMessageDeleted);
    socket.on("publicOwnMessageDeleted", handlepublicOwnMessageDeleted);
    socket.on("publicMessageEdited", handlePublicMessageEdited);
    socket.on("publicMessageReactionUpdated", handlePublicMessageReactionUpdated); // You had this commented out
    socket.on("userBanned", handleUserBannedGlobal);
    socket.on("userUnbanned", handleUserUnbannedGlobal);
    socket.on("public_typing_update", handlePublicTypingUpdate);

    return () => {
      socket.off("newPublicMessage", handleNewPublicMessage);
      socket.off("publicMessageDeleted", handleMessageDeleted);
      socket.off("publicOwnMessageDeleted", handlepublicOwnMessageDeleted);
      socket.off("publicMessageEdited", handlePublicMessageEdited);
      socket.off("publicMessageReactionUpdated", handlePublicMessageReactionUpdated); // Unsubscribe
      socket.off("userBanned", handleUserBannedGlobal);
      socket.off("userUnbanned", handleUserUnbannedGlobal);
      socket.off("public_typing_update");
      socket.emit("leavePublicChat"); // Ensure this is only emitted once when the entire chat context unmounts
    };
  }, [socket, queryClient, authUser]); // Dependencies for this hook

  return { typingUsers }; // Return typingUsers state
};
