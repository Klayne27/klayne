import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createBoardCommentApi,
  createBoardPostApi,
  deleteBoardCommentApi,
  deleteBoardPostApi,
  editBoardCommentApi,
  editBoardPostApi,
  reactToBoardCommentApi,
  reactToBoardPostApi,
} from "../../../api/boardApi"
import { boardKeys } from "./boardKeys"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { showAppToast } from "../../../utils/showAppToast"
import { useBoardStore } from "../../../store/useBoardStore"

export const useCreateBoardPost = () => {
  const queryClient = useQueryClient()
  const { mutate: createBoardPost, isPending: isCreating } = useMutation({
    mutationFn: createBoardPostApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.list() })

      showAppToast("Post created!", "success")
    },
    onError: (err) => showAppToast(err.message, "error"),
  })
  return { createBoardPost, isCreating }
}

export const useEditBoardPost = () => {
  const queryClient = useQueryClient()

  const { mutate: editBoardPost, isPending: isEditingPost } = useMutation({
    mutationFn: editBoardPostApi,
    onMutate: async ({ id, content }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(id) })
      const previous = queryClient.getQueryData(boardKeys.detail(id))

      queryClient.setQueryData(boardKeys.detail(id), (old) =>
        old ? { ...old, content, isEdited: true } : old,
      )

      return { previous, id }
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(boardKeys.detail(context.id), context.previous)
      showAppToast(err.message, "error")
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: boardKeys.list() })
    },
    onSuccess: () => showAppToast("Post updated.", "success"),
  })

  return { editBoardPost, isEditingPost }
}

export const useDeleteBoardPost = () => {
  const queryClient = useQueryClient()
  const { mutate: deleteBoardPost, isPending: isDeleting } = useMutation({
    mutationFn: deleteBoardPostApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.list() })
      showAppToast("Post deleted.", "success")
    },
    onError: (err) => showAppToast(err.message, "error"),
  })
  return { deleteBoardPost, isDeleting }
}

export const useReactToBoardPost = () => {
  const queryClient = useQueryClient()
  const { authUser } = useAuthUser()

  const { mutate: reactToPost } = useMutation({
    mutationFn: reactToBoardPostApi,
    onMutate: async ({ id, emoji }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(id) })
      await queryClient.cancelQueries({ queryKey: boardKeys.list() })

      const previousDetail = queryClient.getQueryData(boardKeys.detail(id))
      const previousLists = queryClient.getQueriesData({ queryKey: boardKeys.list() })

      const updatePostLogic = (oldPost) => {
        if (!oldPost || oldPost._id !== id) return oldPost

        const reactions = [...(oldPost.reactions || [])]
        const existingIdx = reactions.findIndex(
          (r) =>
            r.emoji === emoji &&
            (r.userId?._id || r.userId)?.toString() === authUser._id.toString(),
        )

        if (existingIdx !== -1) {
          reactions.splice(existingIdx, 1)
        } else {
          reactions.push({
            emoji,
            userId: {
              _id: authUser._id,
              username: authUser.username,
              fullName: authUser.fullName,
              profileImg: authUser.profileImg,
            },
          })
        }
        return { ...oldPost, reactions }
      }

      // 3. OPTIMISTIC UPDATE: The Detail Page (Your existing logic)
      queryClient.setQueryData(boardKeys.detail(id), updatePostLogic)

      // 4. OPTIMISTIC UPDATE: The List/Grid Page (The missing piece)
      queryClient.setQueryData(boardKeys.list(), (oldData) => {
        if (!oldData) return oldData

        // Handle standard arrays
        if (Array.isArray(oldData)) return oldData.map(updatePostLogic)

        // Handle Infinite Queries/Pagination
        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              posts: page.posts.map(updatePostLogic), // Ensure 'posts' matches your API key
            })),
          }
        }
        return oldData
      })

      return { previousDetail, previousLists }
    },
    onError: (err, { id }, context) => {
      // Rollback Detail
      if (context?.previousDetail) {
        queryClient.setQueryData(boardKeys.detail(id), context.previousDetail)
      }
      // Rollback Lists
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(id) })
      // queryClient.invalidateQueries({ queryKey: boardKeys.list() })
    },
  })

  return { reactToPost }
}

export const useCreateBoardComment = (boardPostId) => {
  const queryClient = useQueryClient()
  const { authUser } = useAuthUser()

  const { mutate: createComment, isPending: isCreatingComment } = useMutation({
    mutationFn: (payload) => createBoardCommentApi({ id: boardPostId, ...payload }),

    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.comments(boardPostId) })
      const previous = queryClient.getQueryData(boardKeys.comments(boardPostId))

      // 1. Find parent comment data in cache if replying to a comment
      let optimisticParent = null
      if (payload.parentCommentId && previous?.pages) {
        // Flatten pages to find the specific comment being replied to
        const allComments = previous.pages.flatMap((page) => page.comments)
        const parentData = allComments.find((c) => c._id === payload.parentCommentId)

        if (parentData) {
          optimisticParent = {
            _id: parentData._id,
            content: parentData.content,
            user: parentData.user, // Now we have the username!
          }
        }
      }

      // 2. Find post author data if replying to the post
      let optimisticBoardPost = null
      if (payload.isReplyToPost) {
        // Attempt to get the post details from the detail cache
        const postData = queryClient.getQueryData(boardKeys.detail(boardPostId))
        optimisticBoardPost = {
          user: postData?.user, // Gets the post owner's username
          title: postData?.title,
        }
      }

      const optimisticComment = {
        _id: `temp-${Date.now()}`,
        content: payload.content,
        user: {
          _id: authUser._id,
          username: authUser.username,
          fullName: authUser.fullName,
          profileImg: authUser.profileImg,
          isVerified: authUser.isVerified,
          isGoldVerified: authUser.isGoldVerified,
        },
        reactions: [],
        isEdited: false,
        createdAt: new Date().toISOString(),
        _isOptimistic: true,
        // Apply the looked-up data
        parentComment: optimisticParent,
        isReplyToPost: payload.isReplyToPost,
        boardPost: optimisticBoardPost,
      }

      queryClient.setQueryData(boardKeys.comments(boardPostId), (oldData) => {
        if (!oldData?.pages) return oldData
        return {
          ...oldData,
          pages: oldData.pages.map((page, i) =>
            i === 0 ? { ...page, comments: [optimisticComment, ...page.comments] } : page,
          ),
        }
      })

      return { previous }
    },

    onError: (err, _, context) => {
      queryClient.setQueryData(boardKeys.comments(boardPostId), context.previous)
      showAppToast(err.message, "error")
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardPostId) })
      queryClient.invalidateQueries({ queryKey: boardKeys.list() })
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.comments(boardPostId) })
    },
  })

  return { createComment, isCreatingComment }
}

export const useDeleteBoardComment = (boardPostId) => {
  const queryClient = useQueryClient()

  const { mutate: deleteComment } = useMutation({
    mutationFn: deleteBoardCommentApi,

    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.comments(boardPostId) })
      const previous = queryClient.getQueryData(boardKeys.comments(boardPostId))

      queryClient.setQueryData(boardKeys.comments(boardPostId), (oldData) => {
        if (!oldData?.pages) return oldData
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            comments: page.comments.filter((c) => c._id !== commentId),
          })),
        }
      })

      return { previous }
    },

    onError: (err, _, context) => {
      queryClient.setQueryData(boardKeys.comments(boardPostId), context.previous)
      showAppToast(err.message, "error")
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.comments(boardPostId) })
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardPostId) })
    },
  })

  return { deleteComment }
}

export const useReactToBoardComment = (boardPostId) => {
  const queryClient = useQueryClient()
  const { authUser } = useAuthUser()

  const { mutate: reactToComment } = useMutation({
    mutationFn: reactToBoardCommentApi,
    onMutate: async ({ commentId, emoji }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.comments(boardPostId) })
      const previous = queryClient.getQueryData(boardKeys.comments(boardPostId))

      queryClient.setQueryData(boardKeys.comments(boardPostId), (oldData) => {
        if (!oldData?.pages) return oldData
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            comments: page.comments.map((c) => {
              if (c._id !== commentId) return c
              const reactions = [...c.reactions]
              const existingIdx = reactions.findIndex(
                (r) =>
                  r.emoji === emoji && (r.userId?._id || r.userId)?.toString() === authUser._id,
              )
              if (existingIdx !== -1) {
                reactions.splice(existingIdx, 1)
              } else {
                reactions.push({
                  emoji,
                  userId: {
                    _id: authUser._id,
                    username: authUser.username,
                    fullName: authUser.fullName,
                    profileImg: authUser.profileImg,
                  },
                })
              }
              return { ...c, reactions }
            }),
          })),
        }
      })

      return { previous }
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(boardKeys.comments(boardPostId), context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.comments(boardPostId) })
    },
  })

  return { reactToComment }
}

export const useEditBoardComment = (boardPostId) => {
  const queryClient = useQueryClient()

  const { mutate: editComment, isPending: isEditingComment } = useMutation({
    mutationFn: editBoardCommentApi,
    onMutate: async ({ commentId, content }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.comments(boardPostId) })
      const previous = queryClient.getQueryData(boardKeys.comments(boardPostId))

      queryClient.setQueryData(boardKeys.comments(boardPostId), (oldData) => {
        if (!oldData?.pages) return oldData
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            comments: page.comments.map((c) =>
              c._id === commentId ? { ...c, content, isEdited: true } : c,
            ),
          })),
        }
      })

      return { previous }
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(boardKeys.comments(boardPostId), context.previous)
      showAppToast(err.message, "error")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.comments(boardPostId) })
      queryClient.invalidateQueries({ queryKey: boardKeys.list() })
    },
  })

  return { editComment, isEditingComment }
}
