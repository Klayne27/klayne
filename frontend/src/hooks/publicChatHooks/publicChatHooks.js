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

export const usePublicMessages = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { authUser } = useAuthUser(); // Get authUser to check if the message is from current user

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
      if (lastPage.length === 20) {
        return allPages.length + 1;
      }
      return undefined;
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
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
        if (!oldData) {
          return { pages: [[newMessage]], pageParams: [1] };
        }

        const updatedPages = oldData.pages.map((page) => {
          // Check if this new message (from socket) replaces an optimistic one
          // This check is crucial for the current user's messages
          const existingIndex = page.findIndex(
            (msg) =>
              msg.isOptimistic &&
              msg.sender?._id === authUser._id && // Ensure it's the current user's optimistic message
              msg.content === newMessage.content &&
              !msg.img && // Assuming you don't send img base64 for optimistic updates or handle separately
              !newMessage.img // And the new message also doesn't have an image.
            // For image messages, you'd need a more sophisticated comparison
          );

          if (existingIndex !== -1) {
            // Replace the optimistic message with the real one from the server
            const newPage = [...page];
            newPage[existingIndex] = newMessage;
            return newPage;
          }
          // If it's not a replacement (e.g., it's a message from another user, or a new message for current user)
          return page;
        });

        // After potentially replacing, add the new message if it's genuinely new
        // This is important for messages from other users, or if the current user
        // didn't have an optimistic placeholder for some reason.
        const latestPage = updatedPages[updatedPages.length - 1];
        const alreadyExists = latestPage.some((msg) => msg._id === newMessage._id);

        if (!alreadyExists) {
          // Only add if it doesn't already exist (e.g., from a replacement)
          if (updatedPages.length > 0) {
            updatedPages[updatedPages.length - 1] = [...latestPage, newMessage];
          } else {
            updatedPages.push([newMessage]);
          }
        }

        return {
          ...oldData,
          pages: updatedPages,
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

    const handleMessageRemoved = ({ messageId }) => {
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
    socket.on("publicOwnMessageDeleted", handleMessageRemoved);
    socket.on("publicMessageEdited", handlePublicMessageEdited);
    socket.on("userBanned", handleUserBannedGlobal);
    socket.on("userUnbanned", handleUserUnbannedGlobal);

    return () => {
      socket.off("publicMessageReactionUpdated", handlePublicMessageReactionUpdated);
      socket.off("newPublicMessage", handleNewPublicMessage);
      socket.off("publicMessageDeleted", handleMessageDeleted);
      socket.off("publicOwnMessageDeleted", handleMessageRemoved);
      socket.off("publicMessageEdited", handlePublicMessageEdited);
      socket.off("userBanned", handleUserBannedGlobal);
      socket.off("userUnbanned", handleUserUnbannedGlobal);
      socket.emit("leavePublicChat");
    };
  }, [socket, queryClient, authUser]); // Add authUser to dependency array

  const messages = data?.pages.slice().reverse().flat() || [];

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

  const {
    mutate: sendPublicMessage,
    isPending,
    isError,
    error,
    reset,
  } = useMutation({
    // The actual API call is now the sole responsibility of mutationFn
    mutationFn: async (messageData) => {
      sendPublicMessageApi(messageData);
      // Send the actual message to the server
      // const response = await sendPublicMessageApi(messageData);
      // return response;
    },

    // This is where the optimistic update should happen
    onMutate: async (messageData) => {
      // 1. Generate a temporary client-side ID for the optimistic update
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Cancel any outgoing refetches for the publicMessages query to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ["publicMessages"] });

      // Snapshot the current messages data for potential rollback
      const previousMessages = queryClient.getQueryData(["publicMessages"]);

      // Create the optimistic message object
      let populatedReplyTo = null;
      if (messageData.replyTo) {
        const allMessages = queryClient.getQueryData(["publicMessages"])?.pages.flat();
        const repliedMessageInCache = allMessages?.find(
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
        _id: tempId, // Use the temporary ID
        content: messageData.content,
        img: messageData.imgBase64,
        sender: { // Provide a full sender object, matching your populated sender in the backend
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
        isOptimistic: true, // Mark it as an optimistic update
        replyTo: populatedReplyTo,
        isDeletedByAdmin: false,
        reactions: [],
      };

      // Optimistically update the cache
      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData) {
          return { pages: [[optimisticMessage]], pageParams: [1] };
        }
        const updatedPages = [...oldData.pages];
        // Add to the last page (most recent messages)
        if (updatedPages.length > 0) {
          updatedPages[updatedPages.length - 1] = [...updatedPages[updatedPages.length - 1], optimisticMessage];
        } else {
          updatedPages.push([optimisticMessage]); // If no pages exist, create the first one
        }
        return {
          ...oldData,
          pages: updatedPages,
        };
      });

      // Return a context object with the previous data and the tempId for onError rollback
      return { previousMessages, tempId };
    },

    // onSuccess is for when the server responds successfully
    onSuccess: (serverMessage, variables, context) => {
      // The socket listener `handleNewPublicMessage` is responsible for
      // replacing the optimistic message with the server-returned message.
      // This is generally the most robust approach in real-time apps.
      // We don't need to explicitly update the cache here because the socket
      // listener will do it authoritatively.

      // If you weren't using sockets, you would do the replacement here:
      /*
      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData) return oldData;
        const updatedPages = oldData.pages.map((page) =>
          page.map((msg) =>
            msg._id === context.tempId ? { ...serverMessage, isOptimistic: false } : msg
          )
        );
        return { ...oldData, pages: updatedPages };
      });
      */
    },

    // onError is for when the API call fails
    onError: (error, variables, context) => {
      toast.error(error.message || "Failed to send message");
      // Rollback the optimistic update
      if (context?.previousMessages) {
        queryClient.setQueryData(["publicMessages"], context.previousMessages);
      } else {
        // If previousMessages wasn't captured (e.g., initial state was empty),
        // filter out the optimistic message directly.
        queryClient.setQueryData(["publicMessages"], (oldData) => {
          if (!oldData) return oldData;
          const updatedPages = oldData.pages.map((page) =>
            page.filter((msg) => msg._id !== context.tempId)
          );
          return { ...oldData, pages: updatedPages };
        });
      }
    },

    // onSettled is always called, good for invalidating if needed
    onSettled: (data, error, variables, context) => {
      // No explicit invalidation needed if your socket event is reliable for new messages
      // If the socket event is NOT reliable, then you might want to invalidate here:
      // queryClient.invalidateQueries({ queryKey: ["publicMessages"] });
    },
  });

  return { sendPublicMessage, isPending, isError, error, reset };
};

export const useDeletePublicMessage = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const {
    mutate: deletePublicMessage,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: deletePublicMessageApi,
    onSuccess: (data, messageId) => {
      // toast.success("Message marked as deleted (Admin action)");
      // // Optimistic update for admin delete - optional, as socket handles it
      // queryClient.setQueryData(["publicMessages"], (oldData) => {
      //     if (!oldData) return oldData;
      //     const updatedPages = oldData.pages.map((page) =>
      //         page.map((message) =>
      //             message._id === messageId
      //                 ? {
      //                       ...message,
      //                       isDeletedByAdmin: true,
      //                       content: "[Message Deleted]", // Ensure content is updated
      //                       img: null, // Clear image
      //                   }
      //                 : message
      //         )
      //     );
      //     return { ...oldData, pages: updatedPages };
      // });
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