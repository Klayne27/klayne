import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addCommentApi, replyToCommentApi } from "../../api/commentsApi";
import toast from "react-hot-toast";
import { useAuthUser } from "../authHooks/useAuthUser";

export const useCreateComment = (postId, parentCommentId = null) => {
  const queryClient = useQueryClient();
  const { authUser: currentUser } = useAuthUser();

  const commentsQueryKey = parentCommentId
    ? ["comments", postId, parentCommentId]
    : ["comments", postId]; 

  const { mutate: createComment, isPending: isCreatingComment } = useMutation({
    mutationFn: async ({ text }) => {
      if (parentCommentId) {
        return replyToCommentApi({ postId, parentCommentId, text });
      } else {
        return addCommentApi({ postId, text });
      }
    },
    onMutate: async ({ text }) => {
      await queryClient.cancelQueries({ queryKey: commentsQueryKey });

      const previousComments = queryClient.getQueryData(commentsQueryKey);

      const tempId = `optimistic-${Date.now()}-${Math.random()}`;
      const newOptimisticComment = {
        _id: tempId,
        user: {
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
        isOptimistic: true,
      };

      queryClient.setQueryData(commentsQueryKey, (oldData) => {
        const newPages = oldData?.pages ? [...oldData.pages] : [];
        if (newPages.length === 0) {
          newPages.push({ comments: [], hasNextPage: false });
        }
        newPages[0] = {
          ...newPages[0],
          comments: [...newPages[0].comments, newOptimisticComment].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          ),
        };
        return { ...oldData, pages: newPages };
      });

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

      if (parentCommentId) {
        const parentCommentsQueryKey = ["comments", postId];
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
          comments: newPages[0].comments.map((comment) =>
            comment._id === context.newOptimisticCommentId
              ? { ...newRealComment, isOptimistic: false } 
              : comment
          ),
        };
        newPages[0].comments.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        return { ...oldData, pages: newPages };
      });

      queryClient.invalidateQueries(["post", postId]);
      queryClient.invalidateQueries(["posts"]);
      queryClient.invalidateQueries(["followingPosts"]);
      queryClient.invalidateQueries(["userPosts"]);
      queryClient.invalidateQueries(["likedPosts"]);

      if (parentCommentId) {
        queryClient.invalidateQueries(["comments", postId]); 
      }
    },
    onError: (error, variables, context) => {
      toast.error(error.message || "Failed to add comment.");
      if (context.previousComments) {
        queryClient.setQueryData(commentsQueryKey, context.previousComments);
      }
      if (context.previousPostData) {
        queryClient.setQueryData(["post", postId], context.previousPostData);
      }
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
