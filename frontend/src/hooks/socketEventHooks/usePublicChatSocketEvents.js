import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthUser } from "../authHooks/useAuthUser";
import { useSocket } from "../../context/SocketContext";

export const usePublicChatSocketEvents = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { authUser } = useAuthUser();

  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    if (!socket || !authUser) return;

    socket.emit("public_chat_room");

    // const handleNewPublicMessage = (newMessage) => {
    //   queryClient.setQueryData(["publicMessages"], (oldData) => {
    //     if (!oldData || !oldData.pages || oldData.pages.length === 0) {
    //       return { pages: [[newMessage]], pageParams: [1] };
    //     }

    //     const newPages = oldData.pages.map((page) => [...page]);
    //     const mostRecentPage = newPages[0];

    //     if (newMessage.sender._id === authUser._id) {
    //       const optimisticIndex = mostRecentPage.findIndex((msg) => msg.isOptimistic);
    //       if (optimisticIndex !== -1) {
    //         mostRecentPage[optimisticIndex] = newMessage;
    //       } else {
    //         if (!mostRecentPage.some((msg) => msg._id === newMessage._id)) {
    //           mostRecentPage.push(newMessage);
    //         }
    //       }
    //     } else {
    //       if (!mostRecentPage.some((msg) => msg._id === newMessage._id)) {
    //         mostRecentPage.push(newMessage);
    //       }
    //     }
    //     return { ...oldData, pages: newPages };
    //   });
    // };

    const handleMessageDeleted = ({ messageId }) => {
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
      queryClient.setQueryData(["publicMessages"], (oldData) => {
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

    // socket.on("newPublicMessage", handleNewPublicMessage);
    socket.on("publicMessageDeleted", handleMessageDeleted);
    socket.on("publicOwnMessageDeleted", handlepublicOwnMessageDeleted);
    socket.on("publicMessageEdited", handlePublicMessageEdited);
    socket.on("publicMessageReactionUpdated", handlePublicMessageReactionUpdated); 
    socket.on("userBanned", handleUserBannedGlobal);
    socket.on("userUnbanned", handleUserUnbannedGlobal);
    socket.on("public_typing_update", handlePublicTypingUpdate);

    return () => {
      // socket.off("newPublicMessage", handleNewPublicMessage);
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
