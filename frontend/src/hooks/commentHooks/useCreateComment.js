import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addCommentApi, replyToCommentApi } from "../../api/commentsApi"; // Make sure these functions can accept an 'img' argument
import toast from "react-hot-toast";
import { useAuthUser } from "../authHooks/useAuthUser";

export const useCreateComment = (postId, parentCommentId = null) => {
  const queryClient = useQueryClient();
  const { authUser: currentUser } = useAuthUser();

  const commentsQueryKey = parentCommentId
    ? ["comments", postId, parentCommentId, "replies"] // Adjust key for replies if needed. This was "comments", postId, parentCommentId in the example, adding "replies" makes it more specific if your fetchComments uses it.
    : ["comments", postId];

  const { mutate: createComment, isPending: isCreatingComment } = useMutation({
    mutationFn: async ({ text, img }) => {
      // <--- MODIFIED: Accept 'img' here
      if (parentCommentId) {
        return replyToCommentApi({ postId, parentCommentId, text, img }); // <--- MODIFIED: Pass 'img'
      } else {
        return addCommentApi({ postId, text, img }); // <--- MODIFIED: Pass 'img'
      }
    },
    onMutate: async ({ text, img }) => {
      // <--- MODIFIED: Accept 'img' here
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
        img: img, // <--- MODIFIED: Include 'img' in optimistic comment
        parentComment: parentCommentId,
        likes: [],
        repliesCount: 0,
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      };

      queryClient.setQueryData(commentsQueryKey, (oldData) => {
        const newPages = oldData?.pages ? [...oldData.pages] : [];
        if (newPages.length === 0) {
          // If there are no pages, initialize the first page correctly
          newPages.push({ comments: [], hasNextPage: false });
        }
        newPages[0] = {
          ...newPages[0],
          // Ensure optimistic comment is added to the correct page, typically the first page (most recent)
          comments: [...newPages[0].comments, newOptimisticComment].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          ),
        };
        return { ...oldData, pages: newPages };
      });

      // Optimistically update the main post's comment count
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

      // Optimistically update the parent comment's repliesCount if it's a reply
      if (parentCommentId) {
        // This query key should target the specific parent comment within the main comments list
        const parentCommentsListQueryKey = ["comments", postId];
        await queryClient.cancelQueries({ queryKey: parentCommentsListQueryKey });
        const previousParentCommentsData = queryClient.getQueryData(
          parentCommentsListQueryKey
        );

        if (previousParentCommentsData) {
          queryClient.setQueryData(
            parentCommentsListQueryKey,
            (oldParentCommentsData) => {
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
            }
          );
        }
      }

      return {
        previousComments,
        previousPostData,
        previousParentCommentsData: parentCommentId
          ? queryClient.getQueryData(["comments", postId])
          : undefined, // Capture parent comments list data for rollback
        newOptimisticCommentId: tempId,
      };
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

      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });

      if (parentCommentId) {
        queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      }
    },
    onError: (error, variables, context) => {
      toast.error(error.message || "Failed to add comment.");
      // Rollback optimistic updates
      if (context.previousComments) {
        queryClient.setQueryData(commentsQueryKey, context.previousComments);
      }
      if (context.previousPostData) {
        queryClient.setQueryData(["post", postId], context.previousPostData);
      }
      if (parentCommentId && context.previousParentCommentsData) {
        // Rollback parent comment repliesCount
        queryClient.setQueryData(
          ["comments", postId], // This key points to the list of top-level comments for the post
          context.previousParentCommentsData
        );
      }
    },
  });

  const createCommentWithReturn = async ({ text, img }) => {
    try {
      await createComment({ text, img }); // Here, createComment IS mutateAsync, which returns a Promise
      return true;
    } catch (error) {
      return false;
    }
  };

  return { createComment, isCreatingComment };
};
