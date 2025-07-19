// src/hooks/publicChatHooks/publicChatHooks.js

import {
  useMutation,
  useQuery,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";

import { useEffect } from "react";
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

export const usePublicMessages = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { authUser } = useAuthUser(); // Get authUser to check if the message is from current user
  const MESSAGE_LIMIT = 40;

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
    // structuralSharing: false, // <--- ADD THIS TEMPORARILY
    refetchOnReconnect: true,
    refetchOnMount: true,

    // select: (data) => ({
    //   ...data,
    //   pages: data.pages.map(
    //     (page) => page.filter((message) => !message.sender?.isBannedInPublicChat) // Filter messages from banned users (for other users)
    //   ),
    // }),
  });

  useEffect(() => {
    if (!socket || !authUser) return; // Ensure authUser is available

    socket.emit("public_chat_room");

    const handleNewPublicMessage = (newMessage) => {
      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          // If no old data, initialize with the new message in the first page
          return { pages: [[newMessage]], pageParams: [1] };
        }

        // Get the current "latest" page (which is the first page in oldData.pages)
        const currentLatestPage = oldData.pages[0];
        let updatedLatestPage = [...currentLatestPage];
        let messageFoundAndReplaced = false;

        // 1. Try to find and replace the optimistic message
        const existingOptimisticIndex = updatedLatestPage.findIndex(
          (msg) =>
            msg.isOptimistic &&
            msg.sender?._id === authUser._id &&
            msg.content === newMessage.content &&
            // Note: If images are involved, ensure your optimistic image handling
            // allows for a reliable comparison/replacement.
            !msg.img &&
            !newMessage.img
        );

        if (existingOptimisticIndex !== -1) {
          updatedLatestPage[existingOptimisticIndex] = {
            ...newMessage,
            isOptimistic: false, // Mark as no longer optimistic
          };
          messageFoundAndReplaced = true;
        }

        // 2. If it wasn't an optimistic message replacement, check for actual duplicates
        // (This handles cases where the message is from another user, or current user
        // without an optimistic placeholder, or if the replacement logic failed)
        const messageAlreadyExistsById = updatedLatestPage.some(
          (msg) => msg._id === newMessage._id
        );

        if (!messageFoundAndReplaced && !messageAlreadyExistsById) {
          // Add the new message to the end of the latest page (chronological order)
          updatedLatestPage.push(newMessage);
        }

        // 3. Enforce the 40 message limit for the *entire* chat view.
        // This will discard older messages, effectively "snapping back" the view.
        // Since `getPublicMessagesApi` gives us pages in chronological order (oldest to newest messages within a page)
        // and the `pages` array is `[[newest page], [older page], ...]`,
        // we need to combine and then take the last 40.
        let allCurrentMessages = [updatedLatestPage, ...oldData.pages.slice(1)].flat();

        // Ensure no duplicates based on _id, in case multiple pages had the same message
        // (less likely with good pagination, but good for robustness)
        const uniqueMessages = [];
        const seenIds = new Set();
        for (let i = allCurrentMessages.length - 1; i >= 0; i--) {
          // Iterate backwards to prioritize newer messages
          const msg = allCurrentMessages[i];
          if (!seenIds.has(msg._id)) {
            uniqueMessages.unshift(msg); // Add to beginning to keep chronological order
            seenIds.add(msg._id);
          }
        }
        allCurrentMessages = uniqueMessages;

        if (allCurrentMessages.length > MESSAGE_LIMIT) {
          // Keep only the latest MESSAGE_LIMIT messages
          allCurrentMessages = allCurrentMessages.slice(-MESSAGE_LIMIT);
        }

        // Re-package into the 'pages' array structure.
        // For simplicity, we can put all 40 messages into a single "page".
        // If your display component specifically relies on `pages[0]` for recent,
        // this might need adjustment, but for `flatMap` it'll work.
        const newPages = [allCurrentMessages];

        // Reset pageParams since we're effectively resetting the fetched data
        const newPageParams = [1]; // Only one page now, so next param would be 2 if infinite scroll was still active.

        return {
          ...oldData,
          pages: newPages,
          pageParams: newPageParams, // Reset pageParams to only fetch from page 1 again
        };
      });
    };

    const handleMessageDeleted = ({ messageId }) => {
      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData) return oldData;
        const updatedPages = oldData.pages.map((page) =>
          page.map((message) =>
            message._id === messageId
              ? {
                  ...message,
                  isDeletedByAdmin: true,
                  content: "[Message Deleted]",
                  img: null,
                }
              : message
          )
        );
        return { ...oldData, pages: updatedPages };
      });
      // toast.success("Message deleted by admin.");
    };

    const handlepublicOwnMessageDeleted = ({ messageId }) => {
      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData) return oldData;
        const updatedPages = oldData.pages.map((page) =>
          page.filter((message) => message._id !== messageId)
        );
        return { ...oldData, pages: updatedPages };
      });
      // toast.success("A message was removed.");
    };

    const handlePublicMessageEdited = ({ messageId, updatedMessage }) => {
      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData || !oldData.pages) {
          console.warn("PublicMessages cache is empty or malformed when editing.", {
            oldData,
          });
          return oldData;
        }

        const updatedPages = oldData.pages.map((page) => {
          // Each 'page' is already an array of messages.
          // Directly map over 'page'.
          if (!Array.isArray(page)) {
            console.warn("Expected page to be an array of messages, got:", page);
            return page; // Return page as is if it's not an array of messages
          }
          return page.map((message) => {
            if (message._id === messageId) {
              return updatedMessage; // Replace with the fully updated message from server
            }
            return message;
          });
        });
        return { ...oldData, pages: updatedPages };
      });
    };

    const handlePublicMessageReactionUpdated = ({ messageId, reactions }) => {
      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData) return oldData;

        const updatedPages = oldData.pages.map((page) =>
          page.map((message) => {
            if (message._id === messageId) {
              // Replace the message's reactions with the updated reactions from the server
              return { ...message, reactions: reactions };
            }
            return message;
          })
        );
        return { ...oldData, pages: updatedPages };
      });
    };

    const handleUserBannedGlobal = ({ userId, username }) => {
      // Other users need to react by filtering out messages from the banned user
      queryClient.invalidateQueries({ queryKey: ["publicMessages"] });
    };

    const handleUserUnbannedGlobal = ({ userId, username }) => {
      // When a user is unbanned, you can invalidate the query to refetch messages
      // This will include any new messages from the unbanned user if they send them.
      // If you want immediate re-appearance of *previous* messages from that user,
      // you would need to store them client-side or have a more complex server-side
      // mechanism to send only that user's past messages. For simplicity, refetching is best.
      queryClient.invalidateQueries({ queryKey: ["publicMessages"] });
      // toast.info(`${username} has been unbanned from the public chat.`);
    };

    socket.on("publicMessageReactionUpdated", handlePublicMessageReactionUpdated);
    socket.on("newPublicMessage", handleNewPublicMessage);
    socket.on("publicMessageDeleted", handleMessageDeleted);
    socket.on("publicOwnMessageDeleted", handlepublicOwnMessageDeleted);
    socket.on("publicMessageEdited", handlePublicMessageEdited);
    socket.on("userBanned", handleUserBannedGlobal);
    socket.on("userUnbanned", handleUserUnbannedGlobal);

    return () => {
      socket.off("publicMessageReactionUpdated", handlePublicMessageReactionUpdated);
      socket.off("newPublicMessage", handleNewPublicMessage);
      socket.off("publicMessageDeleted", handleMessageDeleted);
      socket.off("publicOwnMessageDeleted", handlepublicOwnMessageDeleted);
      socket.off("publicMessageEdited", handlePublicMessageEdited);
      socket.off("userBanned", handleUserBannedGlobal);
      socket.off("userUnbanned", handleUserUnbannedGlobal);
      socket.emit("leavePublicChat");
    };
  }, [socket, queryClient, authUser]); // Add authUser to dependency array

  // const messages = data?.pages.slice().reverse().flat() || [];

  const messages = useMemo(() => {
    return data ? [...data.pages].reverse().flatMap((page) => page) : [];
  }, [data]);

  return {
    messages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
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
          isBannedInPublicChat: authUser.isBannedInPublicChat,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOptimistic: true,
        replyTo: populatedReplyTo,
        isDeletedByAdmin: false,
        reactions: [],
      };

      queryClient.setQueryData(["publicMessages"], (oldData) => {
        let newPages = [];
        let currentLatestPage = [];

        if (oldData && oldData.pages && oldData.pages.length > 0) {
          // Take the existing first page (most recent messages)
          currentLatestPage = [...oldData.pages[0]];
        }

        // Add the new optimistic message to the current latest messages
        currentLatestPage.push(optimisticMessage);

        // Enforce the 40 message limit immediately for the optimistic view
        if (currentLatestPage.length > MESSAGE_LIMIT) {
          currentLatestPage = currentLatestPage.slice(-MESSAGE_LIMIT); // Keep only the last 40
        }

        // The pages array now contains only the one page of 40 messages
        newPages = [currentLatestPage];

        return {
          ...oldData, // Preserve other oldData properties like pageParams, though they might become irrelevant
          pages: newPages,
          pageParams: [1], // Reset pageParams to reflect that we're only showing the first page now
        };
      });

      return { previousMessages, tempId };
    },

    onSuccess: (serverMessage, variables, context) => {
      // The socket listener handleNewPublicMessage is now fully responsible
      // for replacing and trimming. No action needed here.
    },

    onError: (error, variables, context) => {
      toast.error(error.message || "Failed to send message");
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
   
    onSuccess: (data, messageId) => {

    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete message");
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
      // toast.success("User banned from public chat.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to ban user.");
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
      // toast.success("User unbanned from public chat.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to unban user.");
    },
  });

  return { unbanUser, isPending, isError, error };
};

// --- New React Query Hooks for Reactions ---
export const useAddPublicMessageReaction = () => {
  const queryClient = useQueryClient();
  const { authUser: currentUser } = useAuthUser(); // Get authUser here

  const { mutate: addReaction, isPending: isReacting } = useMutation({
    mutationFn: ({ messageId, emoji }) => addPublicMessageReactionApi(messageId, emoji),
    onMutate: async ({ messageId, emoji }) => {
      await queryClient.cancelQueries({ queryKey: ["publicMessages"] }); // Use object for cancelQueries

      const previousMessages = queryClient.getQueryData(["publicMessages"]);

      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData || !currentUser) {
          // Use currentUser here
          console.warn(
            "Auth user not found for optimistic update, or oldData is missing."
          );
          return oldData;
        }

        const newPages = oldData.pages.map((page) =>
          page.map((msg) => {
            if (msg._id === messageId) {
              const newReactions = [...(msg.reactions || [])];

              // --- This logic is already solid for optimistic add/remove ---
              const existingSpecificEmojiReactionIndex = newReactions.findIndex(
                (r) =>
                  (r.userId?._id || r.userId)?.toString() ===
                    currentUser._id.toString() && // Use currentUser._id
                  r.emoji === emoji
              );

              const newReactionEntry = {
                emoji,
                userId: {
                  // Populate for optimistic UI display
                  _id: currentUser._id,
                  username: currentUser.username,
                  profileImg: currentUser.profileImg,
                  // Add other user details if `populatedMessage` from backend provides them
                  fullName: currentUser.fullName, // Make sure this is in your authUser
                },
              };

              if (existingSpecificEmojiReactionIndex !== -1) {
                newReactions.splice(existingSpecificEmojiReactionIndex, 1);
              } else {
                newReactions.push(newReactionEntry);
              }
              // --- END LOGIC ---

              return { ...msg, reactions: newReactions };
            }
            return msg;
          })
        );
        return { ...oldData, pages: newPages };
      });

      return { previousMessages };
    },
    onError: (err, variables, context) => {
      // toast.error(err.message || "Failed to add reaction.");
      if (context?.previousMessages) {
        queryClient.setQueryData(["publicMessages"], context.previousMessages);
      }
    },
    // `onSettled` is great here because it runs on both success and error.
    // It's ideal for refetching to ensure eventual consistency.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["publicMessages"] }); // Use object for invalidateQueries
    },
  });

  return { addReaction, isReacting };
};

export const useRemovePublicMessageReaction = () => {
  const queryClient = useQueryClient();

  const { mutate: removeReaction, isPending: isRemovingReaction } = useMutation({
    mutationFn: (messageId) => removePublicMessageReactionApi(messageId),
    onMutate: async (messageId) => {
      // Optimistic update
      await queryClient.cancelQueries(["publicMessages"]);

      const previousMessages = queryClient.getQueryData(["publicMessages"]);

      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData) return oldData;

        const newPages = oldData.pages.map((page) =>
          page.map((msg) => {
            if (msg._id === messageId) {
              const newReactions = msg.reactions.filter(
                (r) =>
                  r.userId.toString() !==
                  queryClient.getQueryData(["authUser"])._id.toString()
              );
              return { ...msg, reactions: newReactions };
            }
            return msg;
          })
        );
        return { ...oldData, pages: newPages };
      });

      return { previousMessages };
    },
    onError: (err, variables, context) => {
      // toast.error(err.message || "Failed to remove reaction.");
      if (context?.previousMessages) {
        queryClient.setQueryData(["publicMessages"], context.previousMessages);
      }
    },
    onSettled: () => {
      // queryClient.invalidateQueries(["publicMessages"]);
    },
  });

  return { removeReaction, isRemovingReaction };
};

export const useDeleteOwnPublicMessage = () => {
  const queryClient = useQueryClient();

  const { mutate: deleteOwnMessage, isPending: isDeletingOwnMessage } = useMutation({
    mutationFn: (messageId) => deleteOwnPublicMessageApi(messageId),
    onMutate: async (messageIdToDelete) => {
      // Optimistic Update: Remove the message from the cache immediately
      await queryClient.cancelQueries(["publicMessages"]); // Cancel any ongoing fetches

      const previousMessages = queryClient.getQueryData(["publicMessages"]);

      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData) return oldData;

        const newPages = oldData.pages.map((page) =>
          page.filter((msg) => msg._id !== messageIdToDelete)
        );

        return { ...oldData, pages: newPages };
      });

      // Return a context object with the snapshotted value
      return { previousMessages };
    },
    onError: (err, messageIdToDelete, context) => {
      // Rollback on error
      toast.error(err.message || "Failed to delete message.");
      if (context?.previousMessages) {
        queryClient.setQueryData(["publicMessages"], context.previousMessages);
      }
    },
    onSettled: () => {
      // Invalidate to refetch and ensure consistency with the server
      queryClient.invalidateQueries(["publicMessages"]);
    },
  });

  return { deleteOwnMessage, isDeletingOwnMessage };
};

// NEW: Hook for editing a public message
export const useEditPublicMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, newContent }) =>
      editPublicMessageApi(messageId, newContent),
    onMutate: async ({ messageId, newContent }) => {
      await queryClient.cancelQueries({ queryKey: ["publicMessages"] });
      const previousMessages = queryClient.getQueryData(["publicMessages"]);

      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData || !oldData.pages) {
          return oldData;
        }

        const updatedPages = oldData.pages.map((page) => {
          // Each 'page' is directly an array of messages
          // Remove the `if (!page.messages)` check and `messages:` property in the return
          return page.map((message) => {
            // Directly map over 'page'
            if (message._id === messageId) {
              return {
                ...message,
                content: newContent,
                isEdited: true,
                editedAt: new Date().toISOString(),
                replyTo: message.replyTo
              };
            }
            return message;
          });
        });
        return { ...oldData, pages: updatedPages };
      });

      return { previousMessages };
    },
    onSuccess: (data) => {
      // The socket listener handles the final authoritative update.
    },
    onError: (error, { messageId }, context) => {
      toast.error(error.message || "Failed to edit message.");
      if (context?.previousMessages) {
        queryClient.setQueryData(["publicMessages"], context.previousMessages);
      }
    },
    onSettled: () => {
      // Still no change needed here if socket listener is active
    },
  });
};
