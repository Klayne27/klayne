import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthUser } from "../authHooks/useAuthUser";
import { useSocket } from "../../context/SocketContext";
import { messageKeys } from "../messagesHooks/messageKeys";

export const usePublicChatSocketEvents = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { authUser } = useAuthUser();

  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    if (!socket || !authUser) return;

    socket.emit("public_chat_room");

    const handleMessageDeleted = ({ messageId }) => {
      queryClient.setQueryData(messageKeys.publicMessages(), (oldData) => {
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
            if (message.repliedTo && message.repliedTo._id === messageId) {
              return {
                ...message,
                repliedTo: {
                  ...message.repliedTo,
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
      queryClient.setQueryData(messageKeys.publicMessages(), (oldData) => {
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
            if (message.repliedTo && message.repliedTo._id === messageId) {
              return {
                ...message,
                repliedTo: {
                  ...message.repliedTo,
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
      queryClient.setQueryData(messageKeys.publicMessages(), (oldData) => {
        if (!oldData || !oldData.pages) {
          return oldData;
        }
        const updatedPages = oldData.pages.map((page) =>
          page.map((msg) => {
            if (msg._id == updatedMessage._id) {
              return updatedMessage;
            }
            if (msg.repliedTo && msg.repliedTo._id === updatedMessage._id) {
              return {
                ...msg,
                repliedTo: updatedMessage,
              };
            }
            return msg;
          })
        );
        return { ...oldData, pages: updatedPages };
      });
    };

    const handlePublicMessageReactionUpdated = ({ messageId, reactions }) => {
      queryClient.setQueryData(messageKeys.publicMessages(), (oldData) => {
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
      queryClient.invalidateQueries({ queryKey: messageKeys.publicMessages() });
    };

    const handleUserUnbannedGlobal = ({ userId, username }) => {
      queryClient.invalidateQueries({ queryKey: messageKeys.publicMessages() });
    };

    const handlePublicTypingUpdate = ({ typingUsers: serverTypingUsers }) => {
      setTypingUsers(serverTypingUsers.filter((user) => user.userId !== authUser._id));
    };

    socket.on("publicMessageDeleted", handleMessageDeleted);
    socket.on("publicOwnMessageDeleted", handlepublicOwnMessageDeleted);
    socket.on("publicMessageEdited", handlePublicMessageEdited);
    socket.on("publicMessageReactionUpdated", handlePublicMessageReactionUpdated); 
    socket.on("userBanned", handleUserBannedGlobal);
    socket.on("userUnbanned", handleUserUnbannedGlobal);
    socket.on("public_typing_update", handlePublicTypingUpdate);

    return () => {
      socket.off("publicMessageDeleted", handleMessageDeleted);
      socket.off("publicOwnMessageDeleted", handlepublicOwnMessageDeleted);
      socket.off("publicMessageEdited", handlePublicMessageEdited);
      socket.off("publicMessageReactionUpdated", handlePublicMessageReactionUpdated);
      socket.off("userBanned", handleUserBannedGlobal);
      socket.off("userUnbanned", handleUserUnbannedGlobal);
      socket.off("public_typing_update");
      socket.emit("leavePublicChat");
    };
  }, [socket, queryClient, authUser]);

  return { typingUsers };
};
