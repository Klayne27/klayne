import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCommentApi } from "../../api/commentsApi";
import toast from "react-hot-toast";

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  const { mutate: deleteComment, isPending: isDeletingComment } = useMutation({
    mutationFn: deleteCommentApi,
    onMutate: async ({ commentId, postId, parentCommentId }) => {
      let previousParentCommentsData = undefined;

      const commentsQueryKey = parentCommentId
        ? ["comments", postId, parentCommentId]
        : ["comments", postId];

      await queryClient.cancelQueries({ queryKey: commentsQueryKey });

      const previousCommentsData = queryClient.getQueryData(commentsQueryKey);

      queryClient.setQueryData(commentsQueryKey, (oldData) => {
        const newPages = oldData?.pages ? [...oldData.pages] : [];
        const updatedPages = newPages.map((page) => ({
          ...page,
          comments: page.comments.filter((comment) => comment._id !== commentId),
        }));
        return { ...oldData, pages: updatedPages };
      });

      const postQueryKey = ["post", postId];
      await queryClient.cancelQueries({ queryKey: postQueryKey });
      const previousPostData = queryClient.getQueryData(postQueryKey);

      if (previousPostData) {
        queryClient.setQueryData(postQueryKey, (oldPostData) => {
          if (!oldPostData) return oldPostData;
          return {
            ...oldPostData,
            commentsCount: Math.max(0, (oldPostData.commentsCount || 0) - 1),
          };
        });
      }

      if (parentCommentId) {
        const parentCommentsQueryKey = ["comments", postId];
        await queryClient.cancelQueries({ queryKey: parentCommentsQueryKey });
        previousParentCommentsData = queryClient.getQueryData(parentCommentsQueryKey);

        if (previousParentCommentsData) {
          queryClient.setQueryData(parentCommentsQueryKey, (oldParentCommentsData) => {
            if (!oldParentCommentsData) return oldParentCommentsData;
            const updatedPages = oldParentCommentsData.pages.map((page) => ({
              ...page,
              comments: page.comments.map((comment) =>
                comment._id === parentCommentId
                  ? {
                      ...comment,
                      repliesCount: Math.max(0, (comment.repliesCount || 0) - 1),
                    }
                  : comment
              ),
            }));
            return { ...oldParentCommentsData, pages: updatedPages };
          });
        }
      }

      return { previousCommentsData, previousPostData, previousParentCommentsData };
    },
    onSuccess: (data, { postId }) => {
      toast.success(data.message || "Comment deleted!");

      queryClient.invalidateQueries(["comments", postId]);
      queryClient.invalidateQueries(["post", postId]);
      queryClient.invalidateQueries(["posts"]);
      queryClient.invalidateQueries(["followingPosts"]);
      queryClient.invalidateQueries(["userPosts"]);
      queryClient.invalidateQueries(["notifications"]);
    },
    onError: (error, { postId }, context) => {
      toast.error(error.message || "Failed to delete comment.");
      if (context.previousCommentsData) {
        const commentsQueryKey = context.parentCommentId
          ? ["comments", postId, context.parentCommentId]
          : ["comments", postId];
        queryClient.setQueryData(commentsQueryKey, context.previousCommentsData);
      }
      if (context.previousPostData) {
        queryClient.setQueryData(["post", postId], context.previousPostData);
      }
      if (context.parentCommentId && context.previousParentCommentsData) {
        queryClient.setQueryData(
          ["comments", postId],
          context.previousParentCommentsData
        );
      }
    },
  });

  return { deleteComment, isDeletingComment };
};
