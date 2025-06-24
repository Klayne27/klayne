// src/hooks/commentsHooks/useCreateComment.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addCommentApi, replyToCommentApi } from "../../api/commentsApi";
import toast from "react-hot-toast";
import { useAuthUser } from "../authHooks/useAuthUser"; // Assuming you need user info for optimistic updates

/**
 * A React Query hook for creating new comments or replies.
 * Supports optimistic updates.
 *
 * @param {string} postId The ID of the post the comment/reply belongs to.
 * @param {string | null} parentCommentId Optional: The ID of the parent comment if this is a reply.
 * @returns {object} Mutation functions and states.
 */
export const useCreateComment = (postId, parentCommentId = null) => {
  const queryClient = useQueryClient();
  const { authUser: currentUser } = useAuthUser();

  // Determine the query key for the comments list to update optimistically
  const commentsQueryKey = parentCommentId
    ? ["comments", postId, parentCommentId] // Key for replies to a specific parent comment
    : ["comments", postId]; // Key for top-level comments on a post

  const { mutate: createComment, isPending: isCreatingComment } = useMutation({
    mutationFn: async ({ text }) => {
      if (parentCommentId) {
        return replyToCommentApi({ postId, parentCommentId, text });
      } else {
        return addCommentApi({ postId, text });
      }
    },
    onMutate: async ({ text }) => {
      // Cancel any outgoing refetches for the comments list
      await queryClient.cancelQueries({ queryKey: commentsQueryKey });

      // Snapshot the previous comments list
      const previousComments = queryClient.getQueryData(commentsQueryKey);

      // Optimistically add the new comment/reply
      const tempId = `optimistic-${Date.now()}-${Math.random()}`; // Unique temporary ID
      const newOptimisticComment = {
        _id: tempId,
        user: {
          // Populate with current user's data for display
          _id: currentUser._id,
          username: currentUser.username,
          fullName: currentUser.fullName,
          profileImg: currentUser.profileImg,
          isVerified: currentUser.isVerified,
        },
        post: postId,
        text: text,
        parentComment: parentCommentId,
        likes: [],
        repliesCount: 0,
        createdAt: new Date().toISOString(),
        isOptimistic: true, // Custom flag for optimistic state
      };

      queryClient.setQueryData(commentsQueryKey, (oldData) => {
        const newPages = oldData?.pages ? [...oldData.pages] : [];
        if (newPages.length === 0) {
          newPages.push({ comments: [], hasNextPage: false });
        }
        // Add the optimistic comment to the first page (or relevant page if you have a more complex structure)
        newPages[0] = {
          ...newPages[0],
          comments: [...newPages[0].comments, newOptimisticComment].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          ),
        };
        return { ...oldData, pages: newPages };
      });

      // Optimistically update the commentsCount on the Post
      // This is a separate query key, so we handle it here
      const postQueryKey = ["post", postId];
      await queryClient.cancelQueries({ queryKey: postQueryKey });
      const previousPostData = queryClient.getQueryData(postQueryKey);

      if (previousPostData) {
        queryClient.setQueryData(postQueryKey, (oldPostData) => {
          if (!oldPostData) return oldPostData;
          return {
            ...oldPostData,
            commentsCount: (oldPostData.commentsCount || 0) + 1,
          };
        });
      }

      // If it's a reply, optimistically update the parent comment's repliesCount
      if (parentCommentId) {
        const parentCommentsQueryKey = ["comments", postId]; // Get the top-level comments to find the parent
        await queryClient.cancelQueries({ queryKey: parentCommentsQueryKey });
        const previousParentCommentsData =
          queryClient.getQueryData(parentCommentsQueryKey);

        if (previousParentCommentsData) {
          queryClient.setQueryData(parentCommentsQueryKey, (oldParentCommentsData) => {
            if (!oldParentCommentsData) return oldParentCommentsData;
            const updatedPages = oldParentCommentsData.pages.map((page) => ({
              ...page,
              comments: page.comments.map((comment) =>
                comment._id === parentCommentId
                  ? { ...comment, repliesCount: (comment.repliesCount || 0) + 1 }
                  : comment
              ),
            }));
            return { ...oldParentCommentsData, pages: updatedPages };
          });
        }
      }

      return { previousComments, previousPostData, newOptimisticCommentId: tempId };
    },
    onSuccess: (newRealComment, variables, context) => {
      toast.success(parentCommentId ? "Reply added!" : "Comment added!");

      queryClient.setQueryData(commentsQueryKey, (oldData) => {
        const newPages = oldData?.pages ? [...oldData.pages] : [];
        if (newPages.length === 0) {
          newPages.push({ comments: [], hasNextPage: false });
        }
        newPages[0] = {
          ...newPages[0],
          // Find the optimistic comment and replace it with the real one
          comments: newPages[0].comments.map((comment) =>
            comment._id === context.newOptimisticCommentId
              ? { ...newRealComment, isOptimistic: false } // Replace optimistic with real data
              : comment
          ),
        };
        // Ensure sorted
        newPages[0].comments.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        return { ...oldData, pages: newPages };
      });

      // Invalidate the post query to get the updated commentsCount (if not updated optimistically)
      queryClient.invalidateQueries(["post", postId]);
      // Also invalidate the main posts feed queries if you want the count to update there
      queryClient.invalidateQueries(["posts"]); // For getAllPosts feed
      queryClient.invalidateQueries(["followingPosts"]); // For getFollowingPosts feed
      queryClient.invalidateQueries(["userPosts"]); // For getUserPosts feed if on a profile
      queryClient.invalidateQueries(["likedPosts"]); // If post comments affect liked posts view

      // If it's a reply, invalidate the parent comments query to update its repliesCount
      if (parentCommentId) {
        queryClient.invalidateQueries(["comments", postId]); // Invalidate top-level comments to update parent's reply count
      }
    },
    onError: (error, variables, context) => {
      toast.error(error.message || "Failed to add comment.");
      // Rollback the optimistic update on error
      if (context.previousComments) {
        queryClient.setQueryData(commentsQueryKey, context.previousComments);
      }
      if (context.previousPostData) {
        queryClient.setQueryData(["post", postId], context.previousPostData);
      }
      // Rollback parent comment repliesCount if it was a reply
      if (parentCommentId && context.previousParentCommentsData) {
        queryClient.setQueryData(
          ["comments", postId],
          context.previousParentCommentsData
        );
      }
    },
  });

  return { createComment, isCreatingComment };
};
