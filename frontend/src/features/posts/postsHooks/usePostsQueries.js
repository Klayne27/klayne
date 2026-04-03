import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query"
import { postKeys } from "./postKeys"
import { getBookmarkedPostsApi, getPinnedPostsApi, getPostApi, getPostHistoryApi, getPostRepliesApi, getPostsApi, getPostThreadApi, getScheduledPostsApi } from "../../../api/postsApi"

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
        return `/api/posts/likes/user/${username}`
      case "userReplies":
        return `/api/posts/replies/user/${username}`
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
  const message = data?.pages?.[0]?.message
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

export const useGetPost = (pid) => {
  const queryClient = useQueryClient()

  const {
    data: post,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: postKeys.details(pid),
    queryFn: () => getPostApi(pid),
    enabled: !!pid,
    staleTime: 15 * 60 * 1000,

    initialData: () => {
      const allPostsData = queryClient.getQueryCache().findAll({
        queryKey: ["posts"], // This matches your postKeys.all
      })

      for (const query of allPostsData) {
        const data = query.state.data

        if (data?.pages) {
          for (const page of data.pages) {
            const found =
              page.posts?.find((p) => p._id === pid) ||
              page.replies?.find((r) => r._id === pid) ||
              page.replies?.find((r) => r.firstChildReply?._id === pid)?.firstChildReply
            if (found) return found
          }
        }

        if (data?.post?._id === pid) return data.post
        if (data?.ancestors) {
          const found = data.ancestors.find((a) => a._id === pid)
          if (found) return found
        }
      }
      return undefined
    },
    initialDataUpdatedAt: () => queryClient.getQueryState(postKeys.details(pid))?.dataUpdatedAt,
  })

  return { post, isLoading, isError, error, refetch }
}

export const useGetPostThread = (postId) => {
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: postKeys.thread(postId),
    queryFn: () => getPostThreadApi(postId),
    enabled: !!postId,
    staleTime: 5 * 60 * 1000,
    initialData: () => {
      const allQueries = queryClient.getQueryCache().findAll()

      for (const query of allQueries) {
        const d = query.state.data

        if (d?.pages) {
          for (const page of d.pages) {
            const found =
              page.posts?.find((p) => p._id === postId) ||
              page.replies?.find((r) => r._id === postId)

            if (found) {
              if (!found.parentPost) {
                return { post: found, ancestors: [] }
              }
              return undefined
            }
          }
        }

        if (d?.post?._id === postId) return { post: d.post, ancestors: d.ancestors ?? [] }
      }
      return undefined
    },
  })

  return {
    post: data?.post ?? null,
    ancestors: data?.ancestors ?? [],
    isLoading: !data && isLoading,
    isError,
  }
}

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

export const useGetPinnedPosts = (username) => {
  const {
    data: pinnedPosts,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: postKeys.pinned(username),
    queryFn: async () => getPinnedPostsApi(username),
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  return { pinnedPosts, isLoading, isError, error, refetch, isRefetching };
};

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
    queryFn: ({ pageParam = 1 }) => getBookmarkedPostsApi({ pageParam, searchQuery }),
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

export const useGetScheduledPosts = () => {
  const {
    data: scheduledPosts,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: postKeys.list("scheduled"),
    queryFn: getScheduledPostsApi,
  });

  return { scheduledPosts, isLoading, isError, error, refetch };
};

export const useGetPostHistory = (postId) => {
  const {
    data: history,
    isLoading: isLoadingHistory,
    isError: isHistoryError,
    error: historyError,
  } = useQuery({
    queryKey: ["postHistory", postId],
    queryFn: () => getPostHistoryApi(postId),
    enabled: !!postId, // Only run the query if a postId is provided
  })

  return { history, isLoadingHistory, isHistoryError, historyError }
}