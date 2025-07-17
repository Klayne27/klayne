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
  banUserFromPublicChatApi,
  deletePublicMessageApi,
  getPublicMessagesApi,
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
      // If the last fetched page has fewer messages than the limit (20),
      // it means we've reached the end of the messages (no more older messages).
      if (lastPage.length === 20) {
        return allPages.length + 1; // Request the next page (older messages)
      }
      return undefined; // No more pages
    },
    // IMPORTANT: Remove the 'select' option here.
    // We want data.pages to accumulate in the order fetched: [latest_page, older_page, oldest_page].
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  // Effect to handle new incoming messages via Socket.io
  useEffect(() => {
    if (!socket) return;

    socket.emit("public_chat_room");

    const handleNewPublicMessage = (newMessage) => {
      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData) {
          // If no data exists yet, initialize with the new message
          return { pages: [[newMessage]], pageParams: [1] };
        }

        // oldData.pages is an array of arrays (pages).
        // The first array (oldData.pages[0]) contains the most recently fetched page.
        // We want to add the NEW incoming message to the END of this most recent page.
        const updatedPages = [...oldData.pages];
        if (updatedPages.length > 0) {
          // Append the new message to the end of the first page (which is the latest page)
          updatedPages[0] = [...updatedPages[0], newMessage];
        } else {
          // Fallback if pages array is empty (shouldn't happen if oldData exists)
          updatedPages.push([newMessage]);
        }

        return {
          ...oldData,
          pages: updatedPages,
        };
      });
    };

    const handleMessageDeleted = ({ messageId, senderId, content, img }) => {
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
      toast.success("Message deleted by admin.");
    };

    const handleUserBanned = ({ userId, username }) => {
      toast.error(`${username} has been banned from the public chat.`);
    };

    const handleUserUnbanned = ({ userId, username }) => {
      toast.success(`${username} has been unbanned from the public chat.`);
    };

    socket.on("newPublicMessage", handleNewPublicMessage);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("userBanned", handleUserBanned);
    socket.on("userUnbanned", handleUserUnbanned);

    return () => {
      socket.off("newPublicMessage", handleNewPublicMessage);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("userBanned", handleUserBanned);
      socket.off("userUnbanned", handleUserUnbanned);
      socket.emit("leavePublicChat");
    };
  }, [socket, queryClient]);

  // Flatten the pages for rendering.
  // We need to reverse the *order of pages* because `fetchNextPage` appends older pages.
  // So, `data.pages` is `[newest_page, older_page, oldest_page]`.
  // To get a chronological (oldest to newest) flattened array, we reverse `data.pages` first.
  const messages = data?.pages.slice().reverse().flat() || [];
  // Use slice() before reverse() to create a shallow copy and avoid mutating the cached data directly.

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
        queryClient.setQueryData(["publicMessages"], (oldData) => {
          if (!oldData) {
            return { pages: [[newMessage]], pageParams: [1] };
          }
          const updatedPages = [...oldData.pages];
          updatedPages[0] = [...updatedPages[0], newMessage];
          return { ...oldData, pages: updatedPages };
        });
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
      // The socket event will handle the UI update more reliably
      // We can optimismistically update here too, but rely on socket for consistency
      // queryClient.setQueryData(["publicMessages"], (oldData) => {
      //   if (!oldData) return oldData;
      //   const updatedPages = oldData.pages.map((page) =>
      //     page.filter((message) => message._id !== messageId)
      //   );
      //   return { ...oldData, pages: updatedPages };
      // });
      toast.success("Message deleted (admin action)");
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
      // queryClient.invalidateQueries({ queryKey: ["publicMessages"] }); // Optionally refetch all to clear banned user messages
      toast.success("User banned from public chat.");
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
      toast.success("User unbanned from public chat.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to unban user.");
    },
  });

  return { unbanUser, isPending, isError, error };
};
