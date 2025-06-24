// src/hooks/commentsHooks/useDeleteComment.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCommentApi } from "../../api/commentsApi";
import toast from "react-hot-toast";

/**
 * A React Query hook for deleting a comment.
 * Supports optimistic updates.
 *
 * @returns {object} Mutation functions and states.
 */
export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  const { mutate: deleteComment, isPending: isDeletingComment } = useMutation({
    mutationFn: deleteCommentApi,
    onMutate: async ({ commentId, postId, parentCommentId }) => {
      // Initialize previousParentCommentsData here
      let previousParentCommentsData = undefined;

      // Cancel any outgoing refetches for the comments list
      const commentsQueryKey = parentCommentId
        ? ["comments", postId, parentCommentId] // Replies query key
        : ["comments", postId]; // Top-level comments query key

      await queryClient.cancelQueries({ queryKey: commentsQueryKey });

      // Snapshot the previous comments data
      const previousCommentsData = queryClient.getQueryData(commentsQueryKey);

      // Optimistically remove the comment from the appropriate list
      queryClient.setQueryData(commentsQueryKey, (oldData) => {
        const newPages = oldData?.pages ? [...oldData.pages] : [];
        const updatedPages = newPages.map((page) => ({
          ...page,
          comments: page.comments.filter((comment) => comment._id !== commentId),
        }));
        return { ...oldData, pages: updatedPages };
      });

      // Optimistically update the commentsCount on the Post
      const postQueryKey = ["post", postId];
      await queryClient.cancelQueries({ queryKey: postQueryKey });
      const previousPostData = queryClient.getQueryData(postQueryKey);

      if (previousPostData) {
        queryClient.setQueryData(postQueryKey, (oldPostData) => {
          if (!oldPostData) return oldPostData;
          return {
            ...oldPostData,
            commentsCount: Math.max(0, (oldPostData.commentsCount || 0) - 1), // Decrement by 1
          };
        });
      }

      // If it was a reply, optimistically decrement repliesCount on the parent comment
      if (parentCommentId) {
        const parentCommentsQueryKey = ["comments", postId];
        await queryClient.cancelQueries({ queryKey: parentCommentsQueryKey });
        previousParentCommentsData = queryClient.getQueryData(parentCommentsQueryKey); // Assign to the already declared variable

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

      // Invalidate queries to ensure fresh data in case of complex interactions
      queryClient.invalidateQueries(["comments", postId]); // Re-fetch comments for this post
      queryClient.invalidateQueries(["post", postId]); // Re-fetch the post to update its comment count for consistency
      queryClient.invalidateQueries(["posts"]); // Invalidate main feeds
      queryClient.invalidateQueries(["followingPosts"]);
      queryClient.invalidateQueries(["userPosts"]);
      queryClient.invalidateQueries(["notifications"]); // To clear related notifications
    },
    onError: (error, { postId }, context) => {
      toast.error(error.message || "Failed to delete comment.");
      // Rollback optimistic update on error
      if (context.previousCommentsData) {
        const commentsQueryKey = context.parentCommentId
          ? ["comments", postId, context.parentCommentId]
          : ["comments", postId];
        queryClient.setQueryData(commentsQueryKey, context.previousCommentsData);
      }
      if (context.previousPostData) {
        queryClient.setQueryData(["post", postId], context.previousPostData);
      }
      // This check now correctly uses context.previousParentCommentsData which might be undefined
      // if the deleted comment was a top-level one, and the condition will correctly prevent the setQueryData call.
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
