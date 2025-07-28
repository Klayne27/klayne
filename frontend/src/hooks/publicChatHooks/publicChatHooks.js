// src/hooks/publicChatHooks/publicChatHooks.js

import {
  useMutation,
  useQuery,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";

import { useEffect, useState } from "react";
import { useSocket } from "../../context/SocketContext";
import {
  addPublicMessageReactionApi,
  banUserFromPublicChatApi,
  deleteOwnPublicMessageApi,
  deletePublicMessageApi,
  editPublicMessageApi,
  getPublicMessagesApi,
  removePublicMessageReactionApi,
  sendPublicMessageApi,
  unbanUserFromPublicChatApi,
} from "../../api/publicChatApi";
import { useAuthUser } from "../authHooks/useAuthUser";
import { useMemo } from "react";
import { showAppToast } from "../../utils/showAppToast";

export const usePublicMessages = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { authUser } = useAuthUser();
  const MESSAGE_LIMIT = 40;

  // New state to manage typing users
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

// NEW/UPDATED HOOK: useSendPublicMessage
export const useSendPublicMessage = () => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser(); // Get authUser here too for sender details
  const MESSAGE_LIMIT = 40; // Use the same limit

  const {
    mutate: sendPublicMessage,
    isPending,
    isError,
    error,
    reset,
  } = useMutation({
    mutationFn: async (messageData) => {
      sendPublicMessageApi(messageData);
    },

    onMutate: async (messageData) => {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      await queryClient.cancelQueries({ queryKey: ["publicMessages"] });

      const previousMessages = queryClient.getQueryData(["publicMessages"]);

      let populatedReplyTo = null;
      if (messageData.replyTo) {
        // Use previousMessages if it exists, otherwise flatMap an empty array
        const allMessages = previousMessages?.pages.flat() || [];
        const repliedMessageInCache = allMessages.find(
          (msg) => msg._id === messageData.replyTo
        );

        if (repliedMessageInCache) {
          populatedReplyTo = {
            _id: repliedMessageInCache._id,
            content: repliedMessageInCache.content,
            img: repliedMessageInCache.img,
            isDeletedByAdmin: repliedMessageInCache.isDeletedByAdmin,
            isDeletedByUser: repliedMessageInCache.isDeletedByUser,
            sender: {
              _id: repliedMessageInCache.sender?._id,
              username: repliedMessageInCache.sender?.username || "Unknown User",
            },
          };
        }
      }

      const optimisticMessage = {
        _id: tempId,
        content: messageData.content,
        img: messageData.imgBase64,
        sender: {
          _id: authUser._id,
          username: authUser.username,
          fullName: authUser.fullName,
          profileImg: authUser.profileImg,
          isAdmin: authUser.isAdmin,
          isVerified: authUser.isVerified,
          isGoldVerified: authUser.isGoldVerified,
          isBannedInPublicChat: authUser.isBannedInPublicChat,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOptimistic: true,
        replyTo: populatedReplyTo,
        isDeletedByAdmin: false,
        isDeletedByUser: false,
        reactions: [],
      };

      // ✅ THE FIX: Update the cache correctly
      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return { pages: [[optimisticMessage]], pageParams: [undefined] };
        }

        // 1. Create a deep copy of the pages to avoid direct mutation.
        const newPages = oldData.pages.map((page) => [...page]);

        // 2. Add the new optimistic message to the end of the first page.
        //    This assumes pages[0] holds the newest messages.
        newPages[0].push(optimisticMessage);

        // 3. Return the data with its pagination structure preserved.
        return {
          ...oldData,
          pages: newPages,
        };
      });

      return { previousMessages };
    },

    onSuccess: (serverMessage, variables, context) => {
      // The socket listener handleNewPublicMessage is now fully responsible
      // for replacing and trimming. No action needed here.
    },

    onError: (error, variables, context) => {
      showAppToast(error.message || "Failed to send message", "error");
      // Rollback logic remains mostly the same, ensuring the optimistic message is removed
      if (context?.previousMessages) {
        queryClient.setQueryData(["publicMessages"], context.previousMessages);
      } else {
        queryClient.setQueryData(["publicMessages"], (oldData) => {
          if (!oldData) return oldData;
          const updatedPages = oldData.pages.map((page) =>
            page.filter((msg) => msg._id !== context.tempId)
          );
          return { ...oldData, pages: updatedPages };
        });
      }
    },
    onSettled: (data, error, variables, context) => {
      // No explicit invalidation needed.
    },
  });

  return { sendPublicMessage, isPending, isError, error, reset };
};

export const useDeletePublicMessage = () => {
  const {
    mutate: deletePublicMessage,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: deletePublicMessageApi,

    onSuccess: (data, messageId) => {},
    onError: (error) => {
      showAppToast(error.message || "Failed to delete message", "error");
    },
  });

  return { deletePublicMessage, isPending, isError, error };
};

export const useBanUserFromPublicChat = () => {
  const queryClient = useQueryClient();

  const {
    mutate: banUser,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: banUserFromPublicChatApi,
    onSuccess: (data) => {
      // Invalidate relevant queries or show success
      queryClient.invalidateQueries({ queryKey: ["publicMessages"] }); // Optionally refetch all to clear banned user messages
      // showAppToast("User banned from public chat.");
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to ban user.", "error");
    },
  });

  return { banUser, isPending, isError, error };
};

export const useUnbanUserFromPublicChat = () => {
  const queryClient = useQueryClient();

  const {
    mutate: unbanUser,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: unbanUserFromPublicChatApi,
    onSuccess: (data) => {
      // Invalidate relevant queries or show success
      queryClient.invalidateQueries({ queryKey: ["publicMessages"] });
      // showAppToast("User unbanned from public chat.");
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to unban user.", "error");
    },
  });

  return { unbanUser, isPending, isError, error };
};

// --- New React Query Hooks for Reactions ---
export const useAddPublicMessageReaction = () => {
  const queryClient = useQueryClient();
  const { authUser: currentUser } = useAuthUser();

  const { mutate: addReaction, isPending: isReacting } = useMutation({
    mutationFn: ({ messageId, emoji }) => addPublicMessageReactionApi(messageId, emoji),
    onMutate: async ({ messageId, emoji }) => {
      // Optimistic update: Show the reaction immediately
      // No need to cancel queries unless a re-render from fetching would immediately overwrite.
      // queryClient.cancelQueries({ queryKey: ["publicMessages"] }); // Keep commented or remove

      const previousMessages = queryClient.getQueryData(["publicMessages"]);

      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData || !currentUser) return oldData;

        const newPages = oldData.pages.map((page) =>
          page.map((msg) => {
            if (msg._id === messageId) {
              const newReactions = [...(msg.reactions || [])];
              const existingIndex = newReactions.findIndex(
                (r) =>
                  (r.userId?._id || r.userId)?.toString() === currentUser._id.toString() &&
                  r.emoji === emoji
              );

              // Create an optimistic reaction object that mimics the populated structure
              const optimisticReaction = {
                emoji,
                // Ensure the user object matches what your backend populates
                userId: { // Matches PublicChatMessage.reactions.userId
                  _id: currentUser._id,
                  username: currentUser.username,
                  fullName: currentUser.fullName,
                  profileImg: currentUser.profileImg,
                },
              };

              if (existingIndex !== -1) {
                newReactions.splice(existingIndex, 1);
              } else {
                newReactions.push(optimisticReaction);
              }
              return { ...msg, reactions: newReactions };
            }
            return msg;
          })
        );
        return { ...oldData, pages: newPages };
      });

      return { previousMessages }; // Context for onError
    },
    onSuccess: (updatedMessageFromServer) => {
      // No explicit cache update here, as the Socket.IO event will handle it.
      // We rely on the `publicMessageReactionUpdated` socket event for the ultimate truth.
      // However, it's good practice to invalidate here too, as a fallback in case a socket event is missed.
      // queryClient.invalidateQueries({ queryKey: ["publicMessages"] });
      // If you are relying solely on Socket.IO, this onSuccess can remain empty.
    },
    onError: (err, variables, context) => {
      // showAppToast((err.message || "Failed to add reaction.");
      if (context?.previousMessages) {
        queryClient.setQueryData(["publicMessages"], context.previousMessages);
      }
      queryClient.invalidateQueries({ queryKey: ["publicMessages"] }); // Invalidate on error to refetch correct state
    },
    onSettled: () => {
       // This will refetch in the background, ensuring consistency even if a socket event is missed.
       // It's a safety net.
      //  queryClient.invalidateQueries({ queryKey: ["publicMessages"] });
    }
  });

  return { addReaction, isReacting };
};

export const useDeleteOwnPublicMessage = () => {
  const queryClient = useQueryClient();

  const { mutate: deleteOwnMessage, isPending: isDeletingOwnMessage } = useMutation({
    mutationFn: (messageId) => deleteOwnPublicMessageApi(messageId),
    onMutate: async (messageIdToDelete) => {
      await queryClient.cancelQueries(["publicMessages"]);
      const previousMessages = queryClient.getQueryData(["publicMessages"]);

      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData) return oldData;
        const newPages = oldData.pages.map((page) =>
          page.map((message) => {
            if (message._id === messageIdToDelete) {
              // Optimistically mark as deleted and update content/img
              return {
                ...message,
                isDeletedByUser: true,
                content: "[Message Deleted]", // Set the desired display text
                img: null, // Clear image optimistically
                // You might also want to clear reactions or other sensitive data
                reactions: [],
                replyTo: message.replyTo
                  ? {
                      // Preserve replyTo structure but clear content
                      ...message.replyTo,
                      content: "", // Clear the content of the replied-to message in the optimistic state
                      img: null,
                      isOriginalMessageDeleted: true, // Mark the original as deleted
                    }
                  : null,
              };
            }
            // Also handle if this message was a reply to the one being deleted
            if (message.replyTo && message.replyTo._id === messageIdToDelete) {
              return {
                ...message,
                replyTo: {
                  ...message.replyTo,
                  content: "[Message Deleted]", // For the reply block
                  img: null,
                  isDeletedByUser: true,
                  isOriginalMessageDeleted: true,
                },
              };
            }
            return message;
          })
        );
        return { ...oldData, pages: newPages };
      });

      return { previousMessages };
    },
    onError: (err, messageIdToDelete, context) => {
      showAppToast(err.message || "Failed to delete message.", "error");
      if (context?.previousMessages) {
        queryClient.setQueryData(["publicMessages"], context.previousMessages);
      }
    },
    onSettled: (data, error, variables, context) => {
      // The socket listener 'publicOwnMessageDeleted' will be responsible
      // for the final authoritative update (which is consistent with this optimistic state).
      // No explicit invalidate here is usually needed if the socket is reliable.
    },
  });

  return { deleteOwnMessage, isDeletingOwnMessage };
};

// NEW: Hook for editing a public message
export const useEditPublicMessage = () => {
  const queryClient = useQueryClient();

  // The 'mutate' function is returned from useMutation, let's capture it.
  const { mutate: editPublicMessage, isPending: isEditing } = useMutation({
    mutationFn: ({ messageId, newContent }) =>
      editPublicMessageApi(messageId, newContent),

    onMutate: async ({ messageId, newContent }) => {
      // Your onMutate logic is correct for the optimistic update.
      await queryClient.cancelQueries({ queryKey: ["publicMessages"] });
      const previousMessages = queryClient.getQueryData(["publicMessages"]);

      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData || !oldData.pages) return oldData;

        const updatedPages = oldData.pages.map((page) =>
          page.map((message) => {
            if (message._id === messageId) {
              return {
                ...message,
                content: newContent,
                isEdited: true,
                // editedAt: new Date().toISOString(),
              };
            }
            return message;
          })
        );
        return { ...oldData, pages: updatedPages };
      });

      return { previousMessages };
    },

    // ✅ ADDED: A proper onSuccess handler
    onSuccess: (updatedMessage) => {
      // Use the authoritative data from the server to update the cache.
      // This is faster and more reliable than waiting for the socket echo.
      // queryClient.setQueryData(["publicMessages"], (oldData) => {
      //   if (!oldData) return oldData;
      //   const updatedPages = oldData.pages.map((page) =>
      //     page.map((message) => {
      //       // Case 1: This is the message that was edited.
      //       if (message._id === updatedMessage._id) {
      //         return updatedMessage;
      //       }
      //       // Case 2: This message replies to the edited one. Update its 'replyTo' block.
      //       if (message.replyTo && message.replyTo._id === updatedMessage._id) {
      //         return {
      //           ...message,
      //           replyTo: updatedMessage,
      //         };
      //       }
      //       return message;
      //     })
      //   );
      //   return { ...oldData, pages: updatedPages };
      // });
    },

    onError: (error, variables, context) => {
      console.error("Mutation failed:", error); // Log the actual error to the console
      showAppToast(error.message || "Failed to edit message.", "error");
      if (context?.previousMessages) {
        queryClient.setQueryData(["publicMessages"], context.previousMessages);
      }
    },
  });

  // Return the mutation function and its state from your custom hook
  return { editPublicMessage, isEditing };
};
