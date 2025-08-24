// src/hooks/postsHooks/useFetchPosts.js
import { useInfiniteQuery } from "@tanstack/react-query"
import { fetchPostsApi } from "../../api/postsApi"
import { postKeys } from "./postKeys"

// This hook now takes explicit parameters instead of a raw endpoint
export const useFetchPosts = ({ feedType, username = null }) => {
  const getPostEndpoint = () => {
    switch (feedType) {
      case "forYou":
        return "/api/posts/all"
      case "following":
        return "/api/posts/following"
      case "posts":
        return `/api/posts/user/${username}`
      case "likes":
        return `/api/posts/likes/${username}`
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
    // Use the new, explicit query key factory
    queryKey:
      feedType === "posts"
        ? postKeys.user(username)
        : feedType === "likes"
          ? postKeys.likes(username)
          : postKeys.list(POST_ENDPOINT),
    queryFn: ({ pageParam }) => fetchPostsApi(POST_ENDPOINT, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage?.hasNextPage ? allPages.length + 1 : undefined
    },
    enabled: !!POST_ENDPOINT,
    staleTime: 10 * 60 * 1000,
    gcTime: 1000 * 60 * 5,
  })

  const posts = data?.pages.flatMap((page) => page?.posts || []) || []

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
  }
}
