import { useInfiniteQuery } from "@tanstack/react-query"
import { postKeys } from "./postKeys"
import { getPostsApi } from "../../../api/postsApi"

export const useGetPosts = ({ feedType, username = null }) => {
  const getPostEndpoint = () => {
    switch (feedType) {
      case "forYou":
        return "/api/posts/all"
      case "ic":
        return "/api/posts/ic"
      case "following":
        return "/api/posts/following"
      case "venting":
        return "/api/posts/vent"
      case "posts":
        return `/api/posts/user/${username}`
      case "likes":
        return `/api/posts/likes/${username}`
      case "userReplies":
        return `/api/posts/replies/${username}`
      default:
        return "/api/posts/all"
    }
  }

  const POST_ENDPOINT = getPostEndpoint()

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
    isError,
    error,
  } = useInfiniteQuery({
    // Update queryKey to handle the new feedType
    queryKey:
      feedType === "posts"
        ? postKeys.user(username)
        : feedType === "likes"
          ? postKeys.likes(username)
          : feedType === "userReplies"
            ? postKeys.userReplies(username)
            : postKeys.list(POST_ENDPOINT),
    queryFn: ({ pageParam }) => getPostsApi(POST_ENDPOINT, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage?.hasNextPage ? allPages.length + 1 : undefined
    },
    enabled: !!POST_ENDPOINT,
    staleTime: 10 * 60 * 1000,
    gcTime: 1000 * 60 * 5,
  })

  const posts = data?.pages.flatMap((page) => page?.posts || []) || []
  const message = data?.pages?.[0]?.message // 👈 Corrected: get message from the first page object
  const totalPostsCount = data?.pages[0]?.totalPosts || 0
  const totalLikedPostsCount = data?.pages[0]?.totalLikedPosts || 0

  return {
    posts,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError,
    error,
    totalPostsCount,
    totalLikedPostsCount,
    getPostEndpoint,
    message,
  }
}
