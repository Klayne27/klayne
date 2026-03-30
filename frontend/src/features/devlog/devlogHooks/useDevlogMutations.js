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
import { useAuthUser } from "../../auth/authHooks/useAuthUser"

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
  const { authUser } = useAuthUser()

  return useMutation({
    mutationFn: likeDevlogApi,

    onMutate: async (devlogId) => {
      // Cancel in-flight queries so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: devlogKeys.all })

      const userId = authUser._id

      // Snapshot every devlog-related cache entry for rollback
      const allQueries = queryClient.getQueryCache().getAll()
      const previousData = {}

      allQueries.forEach((query) => {
        const key = query.queryKey
        if (Array.isArray(key) && key[0] === "devlogs") {
          previousData[JSON.stringify(key)] = queryClient.getQueryData(key)
        }
      })

      // Toggle helper — works whether likes contains strings or ObjectId-shaped objects
      const toggleLike = (likes = []) => {
        const isLiked = likes.some((id) => (id?._id ?? id)?.toString() === userId.toString())
        return isLiked
          ? likes.filter((id) => (id?._id ?? id)?.toString() !== userId.toString())
          : [...likes, userId]
      }

      // Patch list cache (infinite query)
      queryClient.setQueriesData({ queryKey: devlogKeys.list() }, (old) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            devlogs: (page.devlogs ?? []).map((devlog) =>
              devlog._id === devlogId ? { ...devlog, likes: toggleLike(devlog.likes) } : devlog,
            ),
          })),
        }
      })

      // Patch detail cache (single query)
      queryClient.setQueryData(devlogKeys.detail(devlogId), (old) => {
        if (!old) return old
        return { ...old, likes: toggleLike(old.likes) }
      })

      return { previousData }
    },

    onError: (err, _devlogId, context) => {
      // Roll back every patched cache entry
      if (context?.previousData) {
        Object.entries(context.previousData).forEach(([key, value]) => {
          queryClient.setQueryData(JSON.parse(key), value)
        })
      }
      toast.error(err.message || "Failed to like devlog")
    },

    // No onSuccess needed — the optimistic update already reflects the correct state.
    // If you want to sync the exact server array (e.g. race condition safety), uncomment:
    // onSuccess: (data, devlogId) => {
    //   queryClient.setQueryData(devlogKeys.detail(devlogId), (old) =>
    //     old ? { ...old, likes: data.likes } : old
    //   )
    // },
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
  const { authUser } = useAuthUser()

  return useMutation({
    mutationFn: likeDevlogCommentApi,

    onMutate: async ({ commentId }) => {
      await queryClient.cancelQueries({ queryKey: devlogKeys.comments(devlogId) })

      const previousComments = queryClient.getQueryData(devlogKeys.comments(devlogId))
      const userId = authUser._id

      queryClient.setQueryData(devlogKeys.comments(devlogId), (old) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            comments: (page.comments ?? []).map((c) => {
              if (c._id !== commentId) return c

              const isLiked = c.likes?.some(
                (id) => (id?._id ?? id)?.toString() === userId.toString(),
              )
              const isDisliked = c.dislikes?.some(
                (id) => (id?._id ?? id)?.toString() === userId.toString(),
              )

              return {
                ...c,
                // Toggle like
                likes: isLiked
                  ? c.likes.filter((id) => (id?._id ?? id)?.toString() !== userId.toString())
                  : [...(c.likes ?? []), userId],
                // Remove dislike if switching sides
                dislikes: isDisliked
                  ? c.dislikes.filter((id) => (id?._id ?? id)?.toString() !== userId.toString())
                  : (c.dislikes ?? []),
              }
            }),
          })),
        }
      })

      return { previousComments }
    },

    onError: (err, _vars, context) => {
      queryClient.setQueryData(devlogKeys.comments(devlogId), context?.previousComments)
      toast.error(err.message || "Failed to like comment")
    },
  })
}

// ─── Comment dislike ──────────────────────────────────────────────────────────

export const useDislikeDevlogComment = (devlogId) => {
  const queryClient = useQueryClient()
  const { authUser } = useAuthUser()

  return useMutation({
    mutationFn: dislikeDevlogCommentApi,

    onMutate: async ({ commentId }) => {
      await queryClient.cancelQueries({ queryKey: devlogKeys.comments(devlogId) })

      const previousComments = queryClient.getQueryData(devlogKeys.comments(devlogId))
      const userId = authUser._id

      queryClient.setQueryData(devlogKeys.comments(devlogId), (old) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            comments: (page.comments ?? []).map((c) => {
              if (c._id !== commentId) return c

              const isDisliked = c.dislikes?.some(
                (id) => (id?._id ?? id)?.toString() === userId.toString(),
              )
              const isLiked = c.likes?.some(
                (id) => (id?._id ?? id)?.toString() === userId.toString(),
              )

              return {
                ...c,
                // Toggle dislike
                dislikes: isDisliked
                  ? c.dislikes.filter((id) => (id?._id ?? id)?.toString() !== userId.toString())
                  : [...(c.dislikes ?? []), userId],
                // Remove like if switching sides
                likes: isLiked
                  ? c.likes.filter((id) => (id?._id ?? id)?.toString() !== userId.toString())
                  : (c.likes ?? []),
              }
            }),
          })),
        }
      })

      return { previousComments }
    },

    onError: (err, _vars, context) => {
      queryClient.setQueryData(devlogKeys.comments(devlogId), context?.previousComments)
      toast.error(err.message || "Failed to dislike comment")
    },
  })
}
