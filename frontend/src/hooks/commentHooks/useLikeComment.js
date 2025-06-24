import { useMutation, useQueryClient } from "@tanstack/react-query";
import { likeUnlikeCommentApi } from "../../api/commentsApi";
import toast from "react-hot-toast";
import { useAuthUser } from "../authHooks/useAuthUser"; 

export const useLikeComment = () => {
  const queryClient = useQueryClient();
  const { authUser: currentUser } = useAuthUser(); 

  const { mutate: likeComment, isPending: isLikingComment } = useMutation({
    mutationFn: likeUnlikeCommentApi,
    onMutate: async ({ commentId, postId, currentLikes }) => {

      const commentsQueryKey = ["comments", postId];
      await queryClient.cancelQueries({ queryKey: commentsQueryKey });

      const previousCommentsData = queryClient.getQueryData(commentsQueryKey);

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

      queryClient.invalidateQueries(["comments", postId]);
      queryClient.invalidateQueries(["notifications"]);
    },
    onError: (error, { postId }, context) => {
      toast.error(error.message || "Failed to update comment like status.");
      if (context.previousCommentsData) {
        queryClient.setQueryData(["comments", postId], context.previousCommentsData);
      }
    },
  });

  return { likeComment, isLikingComment };
};
