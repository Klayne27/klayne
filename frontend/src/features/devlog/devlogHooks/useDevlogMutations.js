import { useMutation, useQueryClient } from "@tanstack/react-query"
import { devlogKeys } from "./devlogKeys"
import {
  createDevlogApi,
  updateDevlogApi,
  deleteDevlogApi,
  likeDevlogApi,
  createDevlogCommentApi,
  deleteDevlogCommentApi,
  likeDevlogCommentApi,
  dislikeDevlogCommentApi,
} from "../../../api/devlogApi"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { showAppToast } from "../../../utils/showAppToast"

export const useCreateDevlog = () => {
  const queryClient = useQueryClient()
  const { mutate: createDevlog, isPending: isCreating } = useMutation({
    mutationFn: createDevlogApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: devlogKeys.list() })
      showAppToast("Devlog posted!", "success")
    },
    onError: (err) => showAppToast(err.message || "Failed to create devlog", "error"),
  })

  return { createDevlog, isCreating }
}

export const useUpdateDevlog = () => {
  const queryClient = useQueryClient()
  const { mutate: updateDevlog, isPending: isUpdating } = useMutation({
    mutationFn: updateDevlogApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: devlogKeys.list() })
      queryClient.invalidateQueries({ queryKey: devlogKeys.detail(data._id) })
      showAppToast("Devlog updated!", "success")
    },
    onError: (err) => showAppToast(err.message || "Failed to update devlog", "error"),
  })

  return { updateDevlog, isUpdating }
}

export const useDeleteDevlog = () => {
  const queryClient = useQueryClient()
  const { mutate: deleteDevlog } = useMutation({
    mutationFn: deleteDevlogApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: devlogKeys.list() })
      showAppToast("Devlog deleted", "success")
    },
    onError: (err) => showAppToast(err.message || "Failed to delete devlog", "error"),
  })

  return { deleteDevlog }
}

export const useLikeDevlog = () => {
  const queryClient = useQueryClient()
  const { authUser } = useAuthUser()

  const { mutate: likeDevlog } = useMutation({
    mutationFn: likeDevlogApi,

    onMutate: async (devlogId) => {
      await queryClient.cancelQueries({ queryKey: devlogKeys.all })

      const userId = authUser._id

      const allQueries = queryClient.getQueryCache().getAll()
      const previousData = {}

      allQueries.forEach((query) => {
        const key = query.queryKey
        if (Array.isArray(key) && key[0] === "devlogs") {
          previousData[JSON.stringify(key)] = queryClient.getQueryData(key)
        }
      })

      const toggleLike = (likes = []) => {
        const isLiked = likes.some((id) => (id?._id ?? id)?.toString() === userId.toString())
        return isLiked
          ? likes.filter((id) => (id?._id ?? id)?.toString() !== userId.toString())
          : [...likes, userId]
      }

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

      queryClient.setQueryData(devlogKeys.detail(devlogId), (old) => {
        if (!old) return old
        return { ...old, likes: toggleLike(old.likes) }
      })

      return { previousData }
    },

    onError: (err, _devlogId, context) => {
      if (context?.previousData) {
        Object.entries(context.previousData).forEach(([key, value]) => {
          queryClient.setQueryData(JSON.parse(key), value)
        })
      }
      showAppToast(err.message || "Failed to like devlog", "error")
    },
  })

  return { likeDevlog }
}

export const useCreateDevlogComment = (devlogId) => {
  const queryClient = useQueryClient()
  const { mutate: createComment, isPending: isCreatingComment } = useMutation({
    mutationFn: createDevlogCommentApi,
    onSuccess: (newComment) => {
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

      queryClient.setQueryData(devlogKeys.detail(devlogId), (old) =>
        old ? { ...old, commentsCount: (old.commentsCount || 0) + 1 } : old,
      )
    },
    onError: (err) => showAppToast(err.message || "Failed to post comment", "error"),
  })

  return { createComment, isCreatingComment }
}

export const useDeleteDevlogComment = (devlogId) => {
  const queryClient = useQueryClient()
  const { mutate: deleteComment, isPending: isDeleting } = useMutation({
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
    onError: (err) => showAppToast(err.message || "Failed to delete comment", "error"),
  })

  return { deleteComment, isDeleting }
}

export const useLikeDevlogComment = (devlogId) => {
  const queryClient = useQueryClient()
  const { authUser } = useAuthUser()

  const { mutate: likeComment, isPending: isLiking } = useMutation({
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
                likes: isLiked
                  ? c.likes.filter((id) => (id?._id ?? id)?.toString() !== userId.toString())
                  : [...(c.likes ?? []), userId],
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
      showAppToast(err.message || "Failed to like comment", "error")
    },
  })

  return { likeComment, isLiking }
}

export const useDislikeDevlogComment = (devlogId) => {
  const queryClient = useQueryClient()
  const { authUser } = useAuthUser()

  const { mutate: dislikeComment, isPending: isDisliking } = useMutation({
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
                dislikes: isDisliked
                  ? c.dislikes.filter((id) => (id?._id ?? id)?.toString() !== userId.toString())
                  : [...(c.dislikes ?? []), userId],
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
      showAppToast(err.message || "Failed to dislike comment", "error")
    },
  })

  return { dislikeComment, isDisliking }
}
