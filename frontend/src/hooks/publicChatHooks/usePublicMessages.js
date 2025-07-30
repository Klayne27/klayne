import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuthUser } from "../authHooks/useAuthUser";
import { useSocket } from "../../context/SocketContext";
import { useState } from "react";
import { getPublicMessagesApi } from "../../api/publicChatApi";
import { useEffect } from "react";

export const usePublicMessages = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { authUser } = useAuthUser();
  const MESSAGE_LIMIT = 40;

  const [typingUsers, setTypingUsers] = useState([]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["publicMessages"],
    queryFn: getPublicMessagesApi,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < MESSAGE_LIMIT) {
        return undefined;
      }
      return allPages.length + 1;
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (!socket || !authUser) return;

    socket.emit("public_chat_room");

    const handleNewPublicMessage = (newMessage) => {
      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return { pages: [[newMessage]], pageParams: [1] };
        }

        // Deep copy pages to avoid mutating the cache directly
        const newPages = oldData.pages.map((page) => [...page]);
        const mostRecentPage = newPages[0];

        // Case 1: The message is from ME (the sender).
        // It's the server confirming my optimistic message.
        if (newMessage.sender._id === authUser._id) {
          const optimisticIndex = mostRecentPage.findIndex((msg) => msg.isOptimistic);

          if (optimisticIndex !== -1) {
            // Replace the optimistic message with the real one
            mostRecentPage[optimisticIndex] = newMessage;
          } else {
            // Fallback if optimistic message wasn't found (should be rare)
            if (!mostRecentPage.some((msg) => msg._id === newMessage._id)) {
              mostRecentPage.push(newMessage);
            }
          }
        }
        // Case 2: The message is from SOMEONE ELSE (a receiver).
        else {
          // Simply add the new message to the end of the list.
          // DO NOT trim or reset pagination. This makes the list grow (40 -> 41).
          if (!mostRecentPage.some((msg) => msg._id === newMessage._id)) {
            mostRecentPage.push(newMessage);
          }
        }

        // Return the updated pages, preserving the structure for receivers.
        return {
          ...oldData,
          pages: newPages,
        };
      });
    };

    // Handler for admin-initiated message deletion (marks as deleted)
    const handleMessageDeleted = ({ messageId }) => {
      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData) return oldData;

        const updatedPages = oldData.pages.map((page) =>
          page.map((message) => {
            // Update the deleted message itself (mark as deleted)
            if (message._id === messageId) {
              return {
                ...message,
                isDeletedByAdmin: true,
                // isDeletedByUser: true,
                // content: "[Message Deleted]",
                img: null,
              };
            }
            // Update any messages that replied to the admin-deleted message
            if (message.replyTo && message.replyTo._id === messageId) {
              return {
                ...message,
                replyTo: {
                  ...message.replyTo,
                  // content: "[Message Deleted]",
                  img: null,
                  isDeletedByAdmin: true, // Ensure this is true
                  // isDeletedByUser: true,
                  isOriginalMessageDeleted: true, // New flag: original message is gone
                  // sender: { username: "Deleted User" },
                },
              };
            }
            return message;
          })
        );
        return { ...oldData, pages: updatedPages };
      });
      // showAppToast("Message deleted by admin.");
    };

    // Handler for sender-initiated message deletion (removes from DB)
    const handlepublicOwnMessageDeleted = ({ messageId }) => {
      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData) return oldData;

        const updatedPages = oldData.pages.map((page) => {
          return page.map((message) => {
            // --- CRUCIAL CHANGE: Mark the message itself as deleted ---
            if (message._id === messageId) {
              return {
                ...message,
                isDeletedByUser: true, // Flag for user-initiated deletion
                // content: "[Message Deleted]", // Display this text instead of the original
                img: null, // Clear image content
                // You might want to clear other sensitive fields here as well
              };
            }

            // --- Update any messages that replied to the now-deleted message ---
            if (message.replyTo && message.replyTo._id === messageId) {
              return {
                ...message,
                replyTo: {
                  ...message.replyTo,
                  // content: "[Message Deleted]", // Or a more specific message
                  img: null,
                  isDeletedByUser: true, // Flag that the original message was deleted by user
                  isOriginalMessageDeleted: true, // Indicates the original message is gone
                  // sender: { username: "Deleted User" }, // Optional: anonymize sender in reply
                },
              };
            }
            return message;
          });
        });
        return { ...oldData, pages: updatedPages };
      });
      // showAppToast("A message was removed.");
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

    // --- End New Socket Listeners ---

    // socket.on("publicMessageReactionUpdated", handlePublicMessageReactionUpdated);
    socket.on("newPublicMessage", handleNewPublicMessage);
    socket.on("publicMessageDeleted", handleMessageDeleted); // For admin deletions
    socket.on("publicOwnMessageDeleted", handlepublicOwnMessageDeleted); // For sender deletions
    socket.on("publicMessageEdited", handlePublicMessageEdited);
    socket.on("userBanned", handleUserBannedGlobal);
    socket.on("userUnbanned", handleUserUnbannedGlobal);
    socket.on("public_typing_update", ({ typingUsers: serverTypingUsers }) => {
      setTypingUsers(serverTypingUsers.filter((user) => user.userId !== authUser._id));
    });

    return () => {
      // socket.off("publicMessageReactionUpdated", handlePublicMessageReactionUpdated);
      socket.off("newPublicMessage", handleNewPublicMessage);
      socket.off("publicMessageDeleted", handleMessageDeleted);
      socket.off("publicOwnMessageDeleted", handlepublicOwnMessageDeleted);
      socket.off("publicMessageEdited", handlePublicMessageEdited);
      socket.off("userBanned", handleUserBannedGlobal);
      socket.off("userUnbanned", handleUserUnbannedGlobal);
      socket.off("public_typing_update");
      socket.emit("leavePublicChat");
    };
  }, [socket, queryClient, authUser]);

  const messages = useMemo(() => {
    return data ? [...data.pages].reverse().flatMap((page) => page) : [];
  }, [data]);

  // Determine if 'someone' (excluding current user) is typing
  const isSomeoneTyping = useMemo(() => {
    return typingUsers.length > 0;
  }, [typingUsers]);

  return {
    messages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
    typingUsers,
    isSomeoneTyping, // Export the typing indicator status
  };
};
