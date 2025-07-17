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
  getPublicMessagesApi,
  removePublicMessageReactionApi,
  sendPublicMessageApi,
  unbanUserFromPublicChatApi,
} from "../../api/publicChatApi";

export const usePublicMessages = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

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
  });

  useEffect(() => {
    if (!socket) return;

    socket.emit("public_chat_room");

    const handleNewPublicMessage = (newMessage) => {
      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData) {
          return { pages: [[newMessage]], pageParams: [1] };
        }
        const updatedPages = [...oldData.pages];
        if (updatedPages.length > 0) {
          updatedPages[0] = [...updatedPages[0], newMessage];
        } else {
          updatedPages.push([newMessage]);
        }
        return {
          ...oldData,
          pages: updatedPages,
        };
      });
    };

    // Handler for ADMIN DELETE: Marks message as deleted, keeps it visible
    const handleMessageDeleted = ({ messageId }) => {
      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData) return oldData;
        const updatedPages = oldData.pages.map((page) =>
          page.map((message) =>
            message._id === messageId
              ? {
                  ...message,
                  isDeletedByAdmin: true,
                  content: "[Message Deleted]", // Ensure content is updated
                  img: null, // Clear image
                }
              : message
          )
        );
        return { ...oldData, pages: updatedPages };
      });
      // toast.success("Message deleted by admin.");
    };

    // NEW Handler for USER OWN DELETE: Removes message completely
    const handleMessageRemoved = ({ messageId }) => {
      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData) return oldData;
        const updatedPages = oldData.pages.map((page) =>
          page.filter((message) => message._id !== messageId)
        );
        return { ...oldData, pages: updatedPages };
      });
      // toast.success("A message was removed."); // Generic toast for others
    };

    const handleUserBanned = ({ userId, username }) => {
      queryClient.invalidateQueries({ queryKey: ["publicMessages"] });
      // toast.error(`${username} has been banned from the public chat.`); // Show toast for admin
    };

    const handleUserUnbanned = ({ userId, username }) => {
      queryClient.invalidateQueries({ queryKey: ["publicMessages"] });
      // toast.success(`${username} has been unbanned from the public chat.`); // Show toast for admin
    };

    socket.on("newPublicMessage", handleNewPublicMessage);
    socket.on("publicMessageDeleted", handleMessageDeleted); // Admin delete
    socket.on("publicOwnMessageDeleted", handleMessageRemoved); // User own delete
    socket.on("userBanned", handleUserBanned);
    socket.on("userUnbanned", handleUserUnbanned);

    return () => {
      socket.off("newPublicMessage", handleNewPublicMessage);
      socket.off("publicMessageDeleted", handleMessageDeleted);
      socket.off("publicOwnMessageDeleted", handleMessageRemoved);
      socket.off("userBanned", handleUserBanned);
      socket.off("userUnbanned", handleUserUnbanned);
      socket.emit("leavePublicChat");
    };
  }, [socket, queryClient]);

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

export const useSendPublicMessage = () => {
  const queryClient = useQueryClient();

  const {
    mutate: sendPublicMessage,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: sendPublicMessageApi,
    onSuccess: (newMessage) => {
      // This will automatically be handled by the socket listener
      // but we can optionally add it here for immediate UI update before socket emits
      // queryClient.setQueryData(["publicMessages"], (oldData) => {
      //   if (!oldData) {
      //     return { pages: [[newMessage]], pageParams: [1] };
      //   }
      //   const updatedPages = [...oldData.pages];
      //   updatedPages[0] = [...updatedPages[0], newMessage];
      //   return { ...oldData, pages: updatedPages };
      // });
      //   toast.success("Message sent!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send message");
    },
  });

  return { sendPublicMessage, isPending, isError, error };
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
            toast.success("Message marked as deleted (Admin action)");
            // Optimistic update for admin delete - optional, as socket handles it
            queryClient.setQueryData(["publicMessages"], (oldData) => {
                if (!oldData) return oldData;
                const updatedPages = oldData.pages.map((page) =>
                    page.map((message) =>
                        message._id === messageId
                            ? {
                                  ...message,
                                  isDeletedByAdmin: true,
                                  content: "[Message Deleted]", // Ensure content is updated
                                  img: null, // Clear image
                              }
                            : message
                    )
                );
                return { ...oldData, pages: updatedPages };
            });
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

  const { mutate: addReaction, isPending: isReacting } = useMutation({
    mutationFn: ({ messageId, emoji }) => addPublicMessageReactionApi(messageId, emoji),
    onMutate: async ({ messageId, emoji }) => {
      await queryClient.cancelQueries(["publicMessages"]);

      const previousMessages = queryClient.getQueryData(["publicMessages"]);

      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData) return oldData;

        const newPages = oldData.pages.map((page) =>
          page.map((msg) => {
            if (msg._id === messageId) {
              const newReactions = [...(msg.reactions || [])];
              const authUser = queryClient.getQueryData(["authUser"]);

              if (!authUser) {
                console.warn(
                  "Auth user not found in cache for optimistic update. Skipping reaction update for message:",
                  messageId
                );
                return msg;
              }

              // --- NEW LOGIC START ---
              // Find if the current user already reacted with THIS SPECIFIC EMOJI
              const existingSpecificEmojiReactionIndex = newReactions.findIndex(
                (r) =>
                  (r.userId?._id || r.userId)?.toString() === authUser._id.toString() &&
                  r.emoji === emoji // Check for the specific emoji
              );

              const newReactionEntry = {
                emoji,
                userId: {
                  _id: authUser._id,
                  username: authUser.username,
                  profileImg: authUser.profileImg,
                },
              };

              if (existingSpecificEmojiReactionIndex !== -1) {
                // User already reacted with this specific emoji -> REMOVE it
                newReactions.splice(existingSpecificEmojiReactionIndex, 1);
              } else {
                // User has NOT reacted with this specific emoji -> ADD it
                newReactions.push(newReactionEntry);
              }
              // --- NEW LOGIC END ---

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
      toast.error(err.message || "Failed to add reaction.");
      if (context?.previousMessages) {
        queryClient.setQueryData(["publicMessages"], context.previousMessages);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries(["publicMessages"]);
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
                (r) => r.userId.toString() !== queryClient.getQueryData(["authUser"])._id.toString()
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
      toast.error(err.message || "Failed to remove reaction.");
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