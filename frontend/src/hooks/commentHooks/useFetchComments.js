import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchCommentsApi } from "../../api/commentsApi";

export const useFetchComments = (postId, parentCommentId = null, enabled = true) => {
  // <--- Add 'enabled' prop
  const isOptimisticId =
    parentCommentId &&
    typeof parentCommentId === "string" &&
    (parentCommentId.startsWith("optimistic-") || parentCommentId.startsWith("temp-"));

  const effectiveParentCommentId =
    parentCommentId === "null" || parentCommentId === undefined || isOptimisticId
      ? null
      : parentCommentId;

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
    staleTime: 15 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    enabled: !!postId && !isOptimisticId && enabled, // <--- Use the new 'enabled' prop here
  });

  const comments = data?.pages?.flatMap((page) => page.comments) || [];

  return {
    comments,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  };
};