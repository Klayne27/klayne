import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { devlogKeys } from "./devlogKeys"
import {
  getDevlogsApi,
  getDevlogApi,
  createDevlogApi,
  updateDevlogApi,
  deleteDevlogApi,
  likeDevlogApi,
  getDevlogCommentsApi,
  createDevlogCommentApi,
  deleteDevlogCommentApi,
  likeDevlogCommentApi,
  dislikeDevlogCommentApi,
} from "../../../api/devlogApi"
import toast from "react-hot-toast"

// ── Read hooks ────────────────────────────────────────────────────────────────

export const useGetDevlogs = () => {
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
    queryKey: devlogKeys.list(),
    queryFn: ({ pageParam = 1 }) => getDevlogsApi(pageParam, 10),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage?.hasNextPage ? allPages.length + 1 : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const devlogs = data?.pages.flatMap((page) => page?.devlogs || []) || []
  const totalCount = data?.pages[0]?.totalCount || 0

  return {
    devlogs,
    totalCount,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError,
    error,
  }
}

export const useGetDevlog = (id) => {
  return useQuery({
    queryKey: devlogKeys.detail(id),
    queryFn: () => getDevlogApi(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export const useGetDevlogComments = (devlogId) => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useInfiniteQuery({
      queryKey: devlogKeys.comments(devlogId),
      queryFn: ({ pageParam = 1 }) => getDevlogCommentsApi(devlogId, pageParam, 20),
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages) =>
        lastPage?.hasNextPage ? allPages.length + 1 : undefined,
      enabled: !!devlogId,
      staleTime: 2 * 60 * 1000,
    })

  const comments = data?.pages.flatMap((page) => page?.comments || []) || []
  const totalCount = data?.pages[0]?.totalCount || 0

  return {
    comments,
    totalCount,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  }
}

// ── Devlog mutations ──────────────────────────────────────────────────────────

export const useCreateDevlog = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createDevlogApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: devlogKeys.list() })
      toast.success("Devlog posted!")
    },
    onError: (err) => toast.error(err.message || "Failed to create devlog"),
  })
}

export const useUpdateDevlog = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateDevlogApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: devlogKeys.list() })
      queryClient.invalidateQueries({ queryKey: devlogKeys.detail(data._id) })
      toast.success("Devlog updated!")
    },
    onError: (err) => toast.error(err.message || "Failed to update devlog"),
  })
}

export const useDeleteDevlog = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteDevlogApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: devlogKeys.list() })
      toast.success("Devlog deleted")
    },
    onError: (err) => toast.error(err.message || "Failed to delete devlog"),
  })
}

export const useLikeDevlog = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: likeDevlogApi,
    onSuccess: (data, devlogId) => {
      // Patch both the list cache and the detail cache optimistically
      const patch = (devlog) => {
        if (devlog._id !== devlogId) return devlog
        return { ...devlog, likes: data.likes }
      }

      queryClient.setQueriesData({ queryKey: devlogKeys.list() }, (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            devlogs: page.devlogs.map(patch),
          })),
        }
      })

      queryClient.setQueryData(devlogKeys.detail(devlogId), (old) =>
        old ? { ...old, likes: data.likes } : old,
      )
    },
    onError: (err) => toast.error(err.message || "Failed to like devlog"),
  })
}

// ── Comment mutations ─────────────────────────────────────────────────────────

export const useCreateDevlogComment = (devlogId) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createDevlogCommentApi,
    onSuccess: (newComment) => {
      // Prepend into the first page of comments cache
      queryClient.setQueryData(devlogKeys.comments(devlogId), (old) => {
        if (!old) return old
        const firstPage = old.pages[0]
        return {
          ...old,
          pages: [
            {
              ...firstPage,
              comments: [newComment, ...(firstPage?.comments || [])],
              totalCount: (firstPage?.totalCount || 0) + 1,
            },
            ...old.pages.slice(1),
          ],
        }
      })

      // Bump commentsCount in the detail cache
      queryClient.setQueryData(devlogKeys.detail(devlogId), (old) =>
        old ? { ...old, commentsCount: (old.commentsCount || 0) + 1 } : old,
      )
    },
    onError: (err) => toast.error(err.message || "Failed to post comment"),
  })
}

export const useDeleteDevlogComment = (devlogId) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteDevlogCommentApi,
    onSuccess: (_, { commentId }) => {
      queryClient.setQueryData(devlogKeys.comments(devlogId), (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            comments: page.comments.filter((c) => c._id !== commentId),
          })),
        }
      })

      queryClient.setQueryData(devlogKeys.detail(devlogId), (old) =>
        old ? { ...old, commentsCount: Math.max(0, (old.commentsCount || 1) - 1) } : old,
      )
    },
    onError: (err) => toast.error(err.message || "Failed to delete comment"),
  })
}

export const useLikeDevlogComment = (devlogId) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: likeDevlogCommentApi,
    onSuccess: (data, { commentId }) => {
      queryClient.setQueryData(devlogKeys.comments(devlogId), (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            comments: page.comments.map((c) =>
              c._id === commentId ? { ...c, likes: data.likes, dislikes: data.dislikes } : c,
            ),
          })),
        }
      })
    },
    onError: (err) => toast.error(err.message || "Failed"),
  })
}

export const useDislikeDevlogComment = (devlogId) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: dislikeDevlogCommentApi,
    onSuccess: (data, { commentId }) => {
      queryClient.setQueryData(devlogKeys.comments(devlogId), (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            comments: page.comments.map((c) =>
              c._id === commentId ? { ...c, likes: data.likes, dislikes: data.dislikes } : c,
            ),
          })),
        }
      })
    },
    onError: (err) => toast.error(err.message || "Failed"),
  })
}
