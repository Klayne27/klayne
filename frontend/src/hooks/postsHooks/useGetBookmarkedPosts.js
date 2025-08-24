import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchBookmarkedPostsApi } from "../../api/postsApi";
import { postKeys } from "./postKeys";

export const useGetBookmarkedPosts = (searchQuery = "") => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: postKeys.bookmarked(searchQuery),
    queryFn: ({ pageParam = 1 }) => fetchBookmarkedPostsApi({ pageParam, searchQuery }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasNextPage) {
        return lastPage.currentPage + 1;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const bookmarkedPosts = data?.pages?.flatMap((page) => page.posts) || [];
  const isLoadingBookmarkedPosts = isLoading;
  const bookmarkedPostsError = error; 

  return {
    bookmarkedPosts,
    isLoadingBookmarkedPosts,
    bookmarkedPostsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
};
