import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createBoardCommentApi,
  createBoardPostApi,
  deleteBoardCommentApi,
  deleteBoardPostApi,
  editBoardCommentApi,
  reactToBoardCommentApi,
  reactToBoardPostApi,
} from "../../../api/boardApi"
import { boardKeys } from "./boardKeys"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { showAppToast } from "../../../utils/showAppToast"

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
      // 1. Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(id) })

      // 2. Snapshot the previous value
      const previous = queryClient.getQueryData(boardKeys.detail(id))

      // 3. Optimistically update to the new value
      queryClient.setQueryData(boardKeys.detail(id), (old) => {
        if (!old) return old

        const reactions = [...(old.reactions || [])]

        // Use the same logic as your comment hook:
        // Check if THIS user already reacted with THIS emoji
        const existingIdx = reactions.findIndex(
          (r) =>
            r.emoji === emoji &&
            (r.userId?._id || r.userId)?.toString() === authUser._id.toString(),
        )

        if (existingIdx !== -1) {
          // Toggle off: remove the reaction entry
          reactions.splice(existingIdx, 1)
        } else {
          // Toggle on: add a new reaction entry matching the Backend structure
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

        return { ...old, reactions }
      })

      return { previous }
    },
    onError: (err, { id }, context) => {
      // Roll back to the previous state if the mutation fails
      if (context?.previous) {
        queryClient.setQueryData(boardKeys.detail(id), context.previous)
      }
    },
    onSettled: (data, error, { id }) => {
      // Sync with server once finished
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(id) })
    },
  })

  return { reactToPost }
}

export const useCreateBoardComment = (boardPostId) => {
  const queryClient = useQueryClient()
  const { mutate: createComment, isPending: isCreatingComment } = useMutation({
    mutationFn: (payload) => createBoardCommentApi({ id: boardPostId, ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.comments(boardPostId) })
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardPostId) })
    },
    onError: (err) => showAppToast(err.message, "error"),
  })
  return { createComment, isCreatingComment }
}

export const useDeleteBoardComment = (boardPostId) => {
  const queryClient = useQueryClient()
  const { mutate: deleteComment } = useMutation({
    mutationFn: deleteBoardCommentApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.comments(boardPostId) })
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardPostId) })
    },
    onError: (err) => showAppToast(err.message, "error"),
  })
  return { deleteComment }
}

export const useReactToBoardComment = (boardPostId) => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

  const { mutate: reactToComment } = useMutation({
    mutationFn: reactToBoardCommentApi,
    onMutate: async ({ commentId, emoji }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.comments(boardPostId) });
      const previous = queryClient.getQueryData(boardKeys.comments(boardPostId));

      queryClient.setQueryData(boardKeys.comments(boardPostId), (oldData) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            comments: page.comments.map((c) => {
              if (c._id !== commentId) return c;
              const reactions = [...c.reactions];
              const existingIdx = reactions.findIndex(
                (r) =>
                  r.emoji === emoji &&
                  (r.userId?._id || r.userId)?.toString() === authUser._id,
              );
              if (existingIdx !== -1) {
                reactions.splice(existingIdx, 1);
              } else {
                reactions.push({
                  emoji,
                  userId: {
                    _id: authUser._id,
                    username: authUser.username,
                    fullName: authUser.fullName,
                    profileImg: authUser.profileImg,
                  },
                });
              }
              return { ...c, reactions };
            }),
          })),
        };
      });

      return { previous };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(boardKeys.comments(boardPostId), context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.comments(boardPostId) });
    },
  });

  return { reactToComment };
};

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
    },
  })

  return { editComment, isEditingComment }
}