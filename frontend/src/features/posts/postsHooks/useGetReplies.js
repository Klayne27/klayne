// useGetReplies.js
import { useInfiniteQuery } from "@tanstack/react-query"
import { getPostRepliesApi } from "../../../api/postsApi"
import { postKeys } from "./postKeys"

export const useGetReplies = (postId) => {
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useInfiniteQuery({
      queryKey: postKeys.replies(postId),
      queryFn: getPostRepliesApi,
      getNextPageParam: (lastPage) =>
        lastPage.hasNextPage ? (lastPage.nextPage ?? true) : undefined,
      enabled: !!postId,
    })

  const replies = data?.pages.flatMap((page) => page.replies) ?? []

  return {
    replies,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  }
}
