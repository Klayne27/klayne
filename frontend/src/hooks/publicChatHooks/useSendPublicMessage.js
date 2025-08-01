import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showAppToast } from "../../utils/showAppToast";
import { sendPublicMessageApi } from "../../api/publicChatApi";
import { useAuthUser } from "../authHooks/useAuthUser";

export const useSendPublicMessage = () => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser(); // Get authUser here too for sender details
  const MESSAGE_LIMIT = 40; // Use the same limit

  const {
    mutate: sendPublicMessage,
    isPending: isSendingPublicMessage,
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

      let populatedRepliedTo = null;
      if (messageData.repliedTo) {
        // Use previousMessages if it exists, otherwise flatMap an empty array
        const allMessages = previousMessages?.pages.flat() || [];
        const repliedMessageInCache = allMessages.find(
          (msg) => msg._id === messageData.repliedTo
        );

        if (repliedMessageInCache) {
          populatedRepliedTo = {
            _id: repliedMessageInCache._id,
            text: repliedMessageInCache.text,
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
        text: messageData.text,
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
        repliedTo: populatedRepliedTo,
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

  return { sendPublicMessage, isSendingPublicMessage, isError, error, reset };
};
