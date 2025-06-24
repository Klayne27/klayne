// src/hooks/commentsHooks/useLikeComment.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { likeUnlikeCommentApi } from "../../api/commentsApi";
import toast from "react-hot-toast";
import { useAuthUser } from "../authHooks/useAuthUser"; // Assuming you need user ID for optimistic updates

/**
 * A React Query hook for liking or unliking a comment.
 * Supports optimistic updates.
 *
 * @returns {object} Mutation functions and states.
 */
export const useLikeComment = () => {
  const queryClient = useQueryClient();
  const { authUser: currentUser } = useAuthUser(); // Current logged-in user

  const { mutate: likeComment, isPending: isLikingComment } = useMutation({
    mutationFn: likeUnlikeCommentApi,
    onMutate: async ({ commentId, postId, currentLikes }) => {
      // currentLikes passed from component to determine initial state
      // Cancel any outgoing refetches for the comments list of the post
      const commentsQueryKey = ["comments", postId];
      await queryClient.cancelQueries({ queryKey: commentsQueryKey });

      // Snapshot the previous comments data
      const previousCommentsData = queryClient.getQueryData(commentsQueryKey);

      // Optimistically update the comment's likes
      queryClient.setQueryData(commentsQueryKey, (oldData) => {
        const newPages = oldData?.pages ? [...oldData.pages] : [];
        const updatedPages = newPages.map((page) => ({
          ...page,
          comments: page.comments.map((comment) => {
            if (comment._id === commentId) {
              const hasLiked = comment.likes.includes(currentUser._id);
              const newLikes = hasLiked
                ? comment.likes.filter((id) => id !== currentUser._id)
                : [...comment.likes, currentUser._id];
              return { ...comment, likes: newLikes };
            }
            return comment;
          }),
        }));
        return { ...oldData, pages: updatedPages };
      });

      return { previousCommentsData };
    },
    onSuccess: (data, { postId, commentId }) => {
      // Data from API usually confirms success, no extra mutation here unless specific return needed

      // Invalidate queries to ensure fresh data in case of complex interactions or other views
      queryClient.invalidateQueries(["comments", postId]);
      queryClient.invalidateQueries(["notifications"]); // If a notification was created/removed
    },
    onError: (error, { postId }, context) => {
      toast.error(error.message || "Failed to update comment like status.");
      // Rollback optimistic update on error
      if (context.previousCommentsData) {
        queryClient.setQueryData(["comments", postId], context.previousCommentsData);
      }
    },
  });

  return { likeComment, isLikingComment };
};
