import { useQuery } from "@tanstack/react-query";
import { getBookmarkedPostsApi } from "../../api/postsApi";

export const useGetBookmarkedPosts = (searchQuery = "") => {
  const {
    data: bookmarkedPosts,
    isLoading: isLoadingBookmarkedPosts,
    error: bookmarkedPostsError,
  } = useQuery({
    queryKey: ["bookmarkedPosts", searchQuery],
    queryFn: () => getBookmarkedPostsApi(searchQuery),
    staleTime: 1000 * 60 * 5, // 5 minutes (adjust as needed)
    refetchOnWindowFocus: false, // Refetch when window regains focus
    refetchOnMount: true, // Refetch when component mounts
  });

  return { bookmarkedPosts, isLoadingBookmarkedPosts, bookmarkedPostsError };
};
