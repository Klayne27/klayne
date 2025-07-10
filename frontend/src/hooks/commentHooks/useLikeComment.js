import { useMutation, useQueryClient } from "@tanstack/react-query";
import { likeUnlikeCommentApi } from "../../api/commentsApi";
import toast from "react-hot-toast";
import { useAuthUser } from "../authHooks/useAuthUser";

export const useLikeComment = () => {
  const queryClient = useQueryClient();
  const { authUser: currentUser } = useAuthUser();

  const { mutate: likeComment, isPending: isLikingComment } = useMutation({
    mutationFn: likeUnlikeCommentApi,
    onMutate: async ({ commentId, postId, parentCommentId }) => {
      // <--- Add parentCommentId here!
      const topLevelCommentsQueryKey = ["comments", postId];
      const repliesQueryKey = parentCommentId
        ? ["comments", postId, parentCommentId]
        : null;

      // Cancel potential refetches for both top-level and reply queries
      await queryClient.cancelQueries({ queryKey: topLevelCommentsQueryKey });
      if (repliesQueryKey) {
        await queryClient.cancelQueries({ queryKey: repliesQueryKey });
      }

      // Store previous data for rollback
      const previousTopLevelCommentsData = queryClient.getQueryData(
        topLevelCommentsQueryKey
      );
      const previousRepliesData = repliesQueryKey
        ? queryClient.getQueryData(repliesQueryKey)
        : null;

      // Function to update a single comment/reply's likes
      const updateLikes = (currentComment) => {
        const hasLiked = currentComment.likes.includes(currentUser._id);
        const newLikes = hasLiked
          ? currentComment.likes.filter((id) => id !== currentUser._id)
          : [...currentComment.likes, currentUser._id];
        return { ...currentComment, likes: newLikes };
      };

      // OPTIMISTIC UPDATE FOR TOP-LEVEL COMMENTS:
      queryClient.setQueryData(topLevelCommentsQueryKey, (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
        const newPages = oldData.pages.map((page) => ({
          ...page,
          comments: page.comments.map((comment) => {
            if (comment._id === commentId) {
              return updateLikes(comment);
            }
            return comment;
          }),
        }));
        return { ...oldData, pages: newPages };
      });

      // OPTIMISTIC UPDATE FOR REPLIES:
      if (repliesQueryKey) {
        queryClient.setQueryData(repliesQueryKey, (oldData) => {
          if (!oldData || !oldData.pages) return oldData;
          const newPages = oldData.pages.map((page) => ({
            ...page,
            comments: page.comments.map((reply) => {
              // These are the replies for the parent
              if (reply._id === commentId) {
                return updateLikes(reply);
              }
              return reply;
            }),
          }));
          return { ...oldData, pages: newPages };
        });
      }

      return { previousTopLevelCommentsData, previousRepliesData };
    },
    onSuccess: (data, { postId, commentId, parentCommentId }) => {
      // <--- Add parentCommentId here!
      // Confirm updates for top-level comments
      queryClient.setQueryData(["comments", postId], (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
        const newPages = oldData.pages.map((page) => ({
          ...page,
          comments: page.comments.map((comment) => {
            if (comment._id === commentId) {
              // Only update if it's the top-level comment being liked
              return { ...comment, likes: data.likes };
            }
            return comment;
          }),
        }));
        return { ...oldData, pages: newPages };
      });

      // Confirm updates for replies
      if (parentCommentId) {
        queryClient.setQueryData(["comments", postId, parentCommentId], (oldData) => {
          if (!oldData || !oldData.pages) return oldData;
          const newPages = oldData.pages.map((page) => ({
            ...page,
            comments: page.comments.map((reply) => {
              // These are the replies for the parent
              if (reply._id === commentId) {
                // Only update if it's the reply being liked
                return { ...reply, likes: data.likes };
              }
              return reply;
            }),
          }));
          return { ...oldData, pages: newPages };
        });
      }

      // Keep this for notification badge update.
      // We will address suggestedUsers refetch separately below.
      // queryClient.invalidateQueries(["notifications"]);
    },
    onError: (error, { postId, parentCommentId }, context) => {
      // <--- Add parentCommentId here!
      toast.error(error.message || "Failed to update comment like status.");
      // Rollback for top-level comments
      if (context.previousTopLevelCommentsData) {
        queryClient.setQueryData(
          ["comments", postId],
          context.previousTopLevelCommentsData
        );
      }
      // Rollback for replies
      if (parentCommentId && context.previousRepliesData) {
        queryClient.setQueryData(
          ["comments", postId, parentCommentId],
          context.previousRepliesData
        );
      }
    },
  });

  return { likeComment, isLikingComment };
};
