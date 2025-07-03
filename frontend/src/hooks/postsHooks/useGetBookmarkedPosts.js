// frontend/src/hooks/postsHooks/useGetBookmarkedPosts.js

import { useInfiniteQuery } from "@tanstack/react-query"; // Changed from useQuery
import { getBookmarkedPostsApi } from "../../api/postsApi";

export const useGetBookmarkedPosts = (searchQuery = "") => {
  const {
    data, // 'data' will now contain {pages: [...], pageParams: [...]}
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading, // Initial loading state
    isError,
    error,
    // Optional: refetch is useful if you want to manually trigger a refresh
    // refetch,
  } = useInfiniteQuery({
    // queryKey depends on search query to refetch when search changes
    queryKey: ["bookmarkedPosts", searchQuery],
    // queryFn now receives an object with pageParam
    queryFn: ({ pageParam = 1 }) => getBookmarkedPostsApi({ pageParam, searchQuery }),
    // This function determines the next pageParam to pass to queryFn
    getNextPageParam: (lastPage, allPages) => {
      // lastPage is the data returned from the previous successful query (e.g., { posts, currentPage, hasNextPage })
      if (lastPage.hasNextPage) {
        return lastPage.currentPage + 1;
      }
      return undefined; // No more pages
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    // If the searchQuery changes, invalidate and refetch from page 1
    // This is handled by React Query automatically when queryKey changes.
  });

  // Flatten the posts array from all pages for rendering
  const bookmarkedPosts = data?.pages?.flatMap((page) => page.posts) || [];
  const isLoadingBookmarkedPosts = isLoading; // Initial loading state
  const bookmarkedPostsError = error; // Error for initial fetch

  return {
    bookmarkedPosts,
    isLoadingBookmarkedPosts,
    bookmarkedPostsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
};
