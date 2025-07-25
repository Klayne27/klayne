import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCommentApi } from "../../api/commentsApi";
import toast from "react-hot-toast";

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  const { mutate: deleteComment, isPending: isDeletingComment } = useMutation({
    mutationFn: deleteCommentApi,
    onMutate: async ({ commentId, postId, parentCommentId }) => {
      // Context object to pass info to onError for rollback
      const context = {
        previousCommentsData: undefined,
        previousPostData: undefined, // Will store the state before *any* optimistic count change
        previousParentCommentsData: undefined,
        optimisticRemovedCommentId: commentId, // Store the ID of the comment being removed
        optimisticParentCommentId: parentCommentId, // Store the parent ID for rollback
      };

      // 1. Optimistic update: Remove the comment (and its replies if rendered nested) from the comments list
      const commentsQueryKey = parentCommentId
        ? ["comments", postId, parentCommentId] // Key for replies of a specific parent
        : ["comments", postId]; // Key for top-level comments of a post

      await queryClient.cancelQueries({ queryKey: commentsQueryKey });
      context.previousCommentsData = queryClient.getQueryData(commentsQueryKey);

      if (context.previousCommentsData) {
        queryClient.setQueryData(commentsQueryKey, (oldData) => {
          if (!oldData) return oldData;
          const newPages = oldData.pages ? [...oldData.pages] : [];
          const updatedPages = newPages.map((page) => ({
            ...page,
            // Filter out the deleted comment. If it's a parent, its replies
            // might also be implicitly removed from the UI if they're nested under it.
            comments: page.comments.filter((comment) => comment._id !== commentId),
          }));
          return { ...oldData, pages: updatedPages };
        });
      }

      // 2. IMPORTANT CHANGE: Do NOT optimistically decrement post.commentsCount here.
      //    It's too hard to predict the exact totalDeletedComments client-side.
      //    We will rely on the backend's definitive count via refetch in onSuccess.

      // Store previous post data *before* any potential UI changes, for rollback
      const postQueryKey = ["post", postId];
      await queryClient.cancelQueries({ queryKey: postQueryKey });
      context.previousPostData = queryClient.getQueryData(postQueryKey);

      // 3. Optimistic update: Decrement parentComment.repliesCount if deleting a reply
      if (parentCommentId) {
        // Key for the top-level comments where the parent comment lives
        const parentCommentsListQueryKey = ["comments", postId];
        await queryClient.cancelQueries({ queryKey: parentCommentsListQueryKey });
        context.previousParentCommentsData = queryClient.getQueryData(
          parentCommentsListQueryKey
        );

        if (context.previousParentCommentsData) {
          queryClient.setQueryData(
            parentCommentsListQueryKey,
            (oldParentCommentsData) => {
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
            }
          );
        }
      }

      return context; // Return the context for onError
    },
    onSuccess: (data, { postId, parentCommentId }) => {
      // Data now contains totalDeletedComments from backend

      // Invalidate the comments list queries to fetch the latest state
      // This ensures all remaining comments and their counts are accurate.
      queryClient.invalidateQueries({ queryKey: ["comments", postId] }); // Invalidate main comments for the post
      if (parentCommentId) {
        // If it was a reply, invalidate its specific replies list as well if it has one (though unlikely for a reply's replies)
        // More importantly, invalidate the parent comment's replies data if it was fetching them separately.
        queryClient.invalidateQueries({
          queryKey: ["comments", postId, parentCommentId],
        });
      }

      // DEFINITIVE UPDATE: Invalidate the post query to refetch its commentsCount from the backend.
      // This is the most reliable way to get the correct total after cascading deletions.
      queryClient.invalidateQueries({ queryKey: ["post", postId] });

      // Optional: Invalidate other related queries
      queryClient.invalidateQueries({ queryKey: ["posts"] }); // If this post appears in a list
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error, variables, context) => {
      // showAppToast(error.message|| "Failed to delete comment.");
      // Revert optimistic updates on error
      if (context.previousCommentsData) {
        const commentsQueryKey = context.optimisticParentCommentId
          ? ["comments", variables.postId, context.optimisticParentCommentId]
          : ["comments", variables.postId];
        queryClient.setQueryData(commentsQueryKey, context.previousCommentsData);
      }
      // Revert the commentsCount on the post (if it was optimistically changed)
      // Since we removed the optimistic count change, this part is now for comments list/replies.
      if (context.previousPostData) {
        queryClient.setQueryData(["post", variables.postId], context.previousPostData);
      }
      if (context.optimisticParentCommentId && context.previousParentCommentsData) {
        queryClient.setQueryData(
          ["comments", variables.postId],
          context.previousParentCommentsData
        );
      }
    },
  });

  return { deleteComment, isDeletingComment };
};
