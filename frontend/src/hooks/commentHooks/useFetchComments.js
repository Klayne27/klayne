// src/hooks/commentsHooks/useFetchComments.js
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchCommentsApi } from "../../api/commentsApi";

/**
 * A React Query hook for fetching paginated comments (top-level or replies)
 * for a specific post or parent comment.
 *
 * @param {string} postId The ID of the post whose comments are being fetched.
 * @param {string | null | 'null'} parentCommentId The ID of the parent comment if fetching replies,
 * or null for top-level comments. Could potentially be the string 'null'.
 * @returns {object} Query results including comments, loading states, and pagination functions.
 */
export const useFetchComments = (postId, parentCommentId = null) => {
  // CRITICAL FIX: Ensure parentCommentId is a string (ObjectId) or actual null, NOT the string "null"
  // OR an optimistic temporary ID.
  const isOptimisticId =
    parentCommentId &&
    typeof parentCommentId === "string" &&
    (parentCommentId.startsWith("optimistic-") || parentCommentId.startsWith("temp-"));

  const effectiveParentCommentId =
    parentCommentId === "null" || parentCommentId === undefined || isOptimisticId
      ? null
      : parentCommentId;

  // Use a unique query key for top-level comments vs. replies
  const queryKey = effectiveParentCommentId
    ? ["comments", postId, effectiveParentCommentId]
    : ["comments", postId];

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
    queryKey: queryKey,
    queryFn: async ({ pageParam = 1 }) =>
      fetchCommentsApi({
        postId,
        parentCommentId: effectiveParentCommentId,
        page: pageParam,
      }),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasNextPage ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // Data considered fresh for 5 minutes
    // IMPORTANT: Only enable this query if postId is available AND parentCommentId is not an optimistic ID.
    // If parentCommentId is an optimistic ID, we disable the query until it's replaced by a real ID.
    enabled: !!postId && !isOptimisticId,
  });

  // Flatten the comments from all pages into a single array for easier consumption
  const comments = data?.pages?.flatMap((page) => page.comments) || [];

  return {
    comments,
    isLoading, // Initial loading state
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage, // Loading state for subsequent pages
    refetch,
  };
};
