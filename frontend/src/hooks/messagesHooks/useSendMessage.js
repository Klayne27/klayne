import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendMessageApi } from "../../api/messagesApi"; // Make sure you have this API function
import { useAuthUser } from "../authHooks/useAuthUser";

export const useSendMessage = ({
  selectedConversation,
  isNewOrTemporaryChat,
  onNewConversationCreated,
  replyingToMessage,
  currentOptimisticIdRef,
}) => {
  const { authUser: currentUser } = useAuthUser();
  const queryClient = useQueryClient();

  const { mutate: sendMessage, isPending: isSendingMessage } = useMutation({
    mutationFn: sendMessageApi,

    onMutate: async (newMessageData) => {
      const queryKey = ["messages", selectedConversation?._id];
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData(queryKey);

      const tempMessageId = `temp-${Date.now()}-${Math.random()}`;
      currentOptimisticIdRef.current = tempMessageId;

      // Your tempMessage creation is perfect, no changes needed here
      const tempMessage = {
        _id: tempMessageId,
        text: newMessageData.message,
        sender: {
          _id: currentUser._id,
          username: currentUser.username,
          fullName: currentUser.fullName,
          profileImg: currentUser.profileImg,
          isVerified: currentUser.isVerified,
        },
        conversationId: selectedConversation._id,
        createdAt: new Date().toISOString(),
        img: newMessageData.img || null,
        seen: false,
        isOptimistic: true,
        repliedTo: replyingToMessage
          ? {
              /* ... your existing reply structure ... */
            }
          : null,
      };

      // 👇 FIX: Correctly update the infinite query cache
      queryClient.setQueryData(queryKey, (oldData) => {
        // 'oldData' is the infinite query object: { pages: [...], pageParams: [...] }
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          // If the cache is empty, create the first page with our new message
          return { pages: [[tempMessage]], pageParams: [1] };
        }

        // Create a deep copy to avoid mutating the original cache object
        const newData = JSON.parse(JSON.stringify(oldData));

        // Add the optimistic message to the *last page*
        newData.pages[newData.pages.length - 1].push(tempMessage);

        return newData;
      });

      return { previousData, optimisticId: tempMessageId };
    },

    onSuccess: (data, variables, context) => {
      // Assuming your API returns an object like { newMessage: {...}, conversationId: "..." }
      const { newMessage, conversationId: newRealConversationId } = data;
      const queryKey = ["messages", newRealConversationId || selectedConversation._id];

      // 👇 FIX: Correctly find and replace the optimistic message in the cache
      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData) return;

        const newData = JSON.parse(JSON.stringify(oldData));

        // Find the page and message index and replace it
        for (let page of newData.pages) {
          const msgIndex = page.findIndex((msg) => msg._id === context.optimisticId);
          if (msgIndex !== -1) {
            page[msgIndex] = newMessage;
            break; // Stop searching once found
          }
        }
        return newData;
      });

      // The rest of your onSuccess logic for handling new conversations seems fine
      if (isNewOrTemporaryChat && selectedConversation._id !== newRealConversationId) {
        queryClient.removeQueries(["messages", selectedConversation._id]);
        if (onNewConversationCreated) {
          onNewConversationCreated(newRealConversationId);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },

    onError: (error, variables, context) => {
      console.error("Error sending message:", error);
      const queryKey = ["messages", selectedConversation._id];

      // 👇 FIX: Correctly remove the optimistic message from the cache on error
      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData) return;

        const newData = JSON.parse(JSON.stringify(oldData));

        // Filter out the failed message from each page
        newData.pages = newData.pages.map((page) =>
          page.filter((msg) => msg._id !== context.optimisticId)
        );

        return newData;
      });

      currentOptimisticIdRef.current = null;
    },

    onSettled: () => {
      // This is fine, ensures conversation list is up-to-date
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  return { sendMessage, isSendingMessage };
};
