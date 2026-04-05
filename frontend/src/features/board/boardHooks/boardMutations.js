import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createBoardCommentApi, createBoardPostApi, deleteBoardCommentApi, deleteBoardPostApi, reactToBoardCommentApi, reactToBoardPostApi } from "../../../api/boardApi"
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
  const queryClient = useQueryClient();
  const { mutate: deleteBoardPost, isPending: isDeleting } = useMutation({
    mutationFn: deleteBoardPostApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.list() });
      showAppToast("Post deleted.", "success");
    },
    onError: (err) => showAppToast(err.message, "error"),
  });
  return { deleteBoardPost, isDeleting };
};

export const useReactToBoardPost = () => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

  const { mutate: reactToPost } = useMutation({
    mutationFn: reactToBoardPostApi,
    onMutate: async ({ id, emoji }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(id) });
      const previous = queryClient.getQueryData(boardKeys.detail(id));

      queryClient.setQueryData(boardKeys.detail(id), (old) => {
        if (!old) return old;
        const reactions = [...(old.reactions || [])];
        const idx = reactions.findIndex((r) => r.emoji === emoji);
        if (idx !== -1) {
          const userIdx = reactions[idx].users.findIndex((u) => u === authUser._id || u?._id === authUser._id);
          if (userIdx !== -1) {
            reactions[idx] = { ...reactions[idx], users: reactions[idx].users.filter((_, i) => i !== userIdx) };
            if (reactions[idx].users.length === 0) reactions.splice(idx, 1);
          } else {
            reactions[idx] = { ...reactions[idx], users: [...reactions[idx].users, authUser._id] };
          }
        } else {
          reactions.push({ emoji, users: [authUser._id] });
        }
        return { ...old, reactions };
      });

      return { previous };
    },
    onError: (err, { id }, context) => {
      queryClient.setQueryData(boardKeys.detail(id), context.previous);
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(id) });
    },
  });

  return { reactToPost };
};

export const useCreateBoardComment = (boardPostId) => {
  const queryClient = useQueryClient();
  const { mutate: createComment, isPending: isCreatingComment } = useMutation({
    mutationFn: (payload) => createBoardCommentApi({ id: boardPostId, ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.comments(boardPostId) });
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardPostId) });
    },
    onError: (err) => showAppToast(err.message, "error"),
  });
  return { createComment, isCreatingComment };
};


export const useDeleteBoardComment = (boardPostId) => {
  const queryClient = useQueryClient();
  const { mutate: deleteComment } = useMutation({
    mutationFn: deleteBoardCommentApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.comments(boardPostId) });
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardPostId) });
    },
    onError: (err) => showAppToast(err.message, "error"),
  });
  return { deleteComment };
};

export const useReactToBoardComment = (boardPostId) => {
  const queryClient = useQueryClient();
  const { mutate: reactToComment } = useMutation({
    mutationFn: reactToBoardCommentApi,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.comments(boardPostId) });
    },
  });
  return { reactToComment };
};