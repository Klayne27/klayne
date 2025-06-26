import { useInfiniteQuery } from "@tanstack/react-query"; // Import useInfiniteQuery
import { fetchMessagesApi } from "../../api/messagesApi";

export const useFetchMessages = (selectedConversation) => {
  const {
    data, // This will now contain an object with 'pages' and 'pageParams'
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["messages", selectedConversation?._id],
    queryFn: ({ pageParam = 1 }) =>
      fetchMessagesApi(selectedConversation?._id, pageParam), // Pass pageParam

    // getNextPageParam is crucial for infinite scrolling
    // It determines the next pageParam to be passed to queryFn
    // based on the data returned from the previous fetch.
    getNextPageParam: (lastPage, allPages) => {
      // If the last page returned less than the limit, it means there are no more messages.
      // Assuming your limit is 20, if lastPage.length < 20, we've reached the end.
      const limit = 20; // Ensure this matches your backend's default limit
      if (lastPage.length < limit) {
        return undefined; // No more pages
      }
      // Otherwise, the next page is the current number of pages + 1
      return allPages.length + 1;
    },
    enabled: !!selectedConversation?._id && !selectedConversation._id.startsWith("new-"), // Only fetch if conversationId exists and is not 'new-'
    staleTime: 5 * 60 * 1000, // Keep data fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep data in cache for 10 minutes

    // Optionally, if you want to initially load the "last" page (most recent messages)
    // and then scroll up to load older ones, this setup is correct (sorting -1 on backend).
    // The `queryFn` `pageParam` will start at 1, fetching the "first" page of the *latest* messages.
    // When you `fetchNextPage`, `pageParam` will increment, fetching older pages.
  });

  // Flatten the messages from all pages into a single array
  const messages = data ? [...data.pages].reverse().flatMap((page) => page) : [];

  return {
    messages,
    isLoading,
    error,
    refetchMessages: refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
};
