import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteMessageApi } from "../../api/messagesApi";
import toast from "react-hot-toast";

export const useDeleteMessage = (convId) => {
  const queryClient = useQueryClient();

  const { mutate: deleteMessage, isPending: isDeletingMessage } = useMutation({
    mutationFn: deleteMessageApi, // This function should accept messageId and conversationId if your API needs it
    onMutate: async ({ messageId, conversationId }) => {
      // Destructure messageId and conversationId
      // 1. Cancel any outgoing refetches for the messages in this conversation
      //    to prevent them from overwriting our optimistic update.
      const queryKey = ["messages", conversationId];
      await queryClient.cancelQueries({ queryKey: queryKey });

      // 2. Snapshot the current messages data before we modify it.
      //    This is crucial for rolling back on error.
      //    oldData will be in the { pages: [...], pageParams: [...] } format from useInfiniteQuery.
      const previousMessagesData = queryClient.getQueryData(queryKey);

      // 3. Optimistically remove the message from the cache.
      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData || !oldData.pages) {
          // If there's no data or it's not in the expected infinite query format,
          // return it as is. This shouldn't happen if the query is enabled.
          return oldData;
        }

        const updatedPages = oldData.pages.map((page) =>
          page.filter((msg) => msg._id !== messageId)
        );

        // Filter out any empty pages that might result from deleting the last message on that page.
        // This prevents empty pages from being rendered.
        const filteredPages = updatedPages.filter((page) => page.length > 0);

        return { ...oldData, pages: filteredPages };
      });

      // 4. Return a context object with the previous data and the query key.
      //    This context will be passed to onError and onSuccess.
      return { previousMessagesData, queryKey, messageId, conversationId };
    },
    onSuccess: (data, variables, context) => {
      // 5. Invalidate relevant queries to refetch from the server.
      //    This ensures eventual consistency and updates other parts of the UI
      //    like the conversation list if the last message was deleted.
      queryClient.invalidateQueries({ queryKey: context.queryKey });
      // queryClient.invalidateQueries({ queryKey: ["conversations"] }); // To update last message shown in sidebar
    },
    onError: (error, variables, context) => {
      toast.error(error.message || "Failed to delete message.");

      // 6. If the mutation fails, roll back to the `previousMessagesData` snapshot.
      if (context?.previousMessagesData) {
        queryClient.setQueryData(context.queryKey, context.previousMessagesData);
      }
    },
    // Optional: onSettled is called regardless of success or error, after onSuccess or onError
    // onSettled: (data, error, variables, context) => {
    //   // You might use this if you need to perform actions after the mutation finishes,
    //   // such as refetching if cancellation wasn't sufficient or if you want to ensure
    //   // that the latest server state is pulled after any optimistic updates.
    // }
  });

  return { deleteMessage, isDeletingMessage };
};
