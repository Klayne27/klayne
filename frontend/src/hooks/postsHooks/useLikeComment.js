// frontend/src/hooks/postsHooks/useLikeComment.js (new file)
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { likeUnlikeCommentApi } from "../../api/postsApi"; // Your API call
import { useAuthUser } from "../authHooks/useAuthUser"; // To get current user ID

export const useLikeComment = () => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser(); // Current authenticated user

  const { mutate: likeComment, isPending: isLikingComment } = useMutation({
    mutationFn: ({ postId, commentId }) => likeUnlikeCommentApi(postId, commentId),
    // onMutate: async ({ postId, commentId }) => {
    //   if (!authUser?._id) {
    //     console.warn("authUser not available for optimistic comment like update.");
    //     return;
    //   }

    //   // 1. Cancel any outgoing refetches for the specific post
    //   await queryClient.cancelQueries({ queryKey: ["posts", postId] });
    //   await queryClient.cancelQueries({ queryKey: ["posts"] }); // Cancel general posts list if affected

    //   // 2. Snapshot the current post data
    //   const previousPostData = queryClient.getQueryData(["posts", postId]);
    //   const previousAllPostsData = queryClient.getQueryData(["posts"]); // For paginated list

    //   // 3. Optimistically update the single post's comments cache
    //   queryClient.setQueryData(["posts", postId], (oldPost) => {
    //     if (!oldPost || !oldPost.comments) return oldPost;

    //     const updatedComments = oldPost.comments.map((comment) => {
    //       if (comment._id === commentId) {
    //         const isCurrentlyLiked = comment.likes?.includes(authUser._id);
    //         return {
    //           ...comment,
    //           likes: isCurrentlyLiked
    //             ? (comment.likes || []).filter((id) => id !== authUser._id)
    //             : [...(comment.likes || []), authUser._id],
    //         };
    //       }
    //       return comment;
    //     });

    //     return {
    //       ...oldPost,
    //       comments: updatedComments,
    //     };
    //   });

    //   // 4. Optimistically update the paginated list of posts (if the current post is in it)
    //   queryClient.setQueryData(["posts"], (oldData) => {
    //     if (!oldData || !Array.isArray(oldData.pages)) return oldData;

    //     return {
    //       ...oldData,
    //       pages: oldData.pages.map((page) => ({
    //         ...page,
    //         posts: Array.isArray(page.posts)
    //           ? page.posts.map((postItem) => {
    //               if (postItem._id === postId) {
    //                 const updatedComments = postItem.comments.map((comment) => {
    //                   if (comment._id === commentId) {
    //                     const isCurrentlyLiked = comment.likes?.includes(authUser._id);
    //                     return {
    //                       ...comment,
    //                       likes: isCurrentlyLiked
    //                         ? (comment.likes || []).filter((id) => id !== authUser._id)
    //                         : [...(comment.likes || []), authUser._id],
    //                     };
    //                   }
    //                   return comment;
    //                 });
    //                 return { ...postItem, comments: updatedComments };
    //               }
    //               return postItem;
    //             })
    //           : page.posts,
    //       })),
    //     };
    //   });

    //   // Return snapshot for rollback
    //   return { previousPostData, previousAllPostsData };
    // },
    onError: (error, { postId }, context) => {
      toast.error(error.message || "Failed to like/unlike comment.");
      console.error("Comment like mutation failed for postId:", postId, error);

      // Rollback the cache
      if (context?.previousPostData) {
        queryClient.setQueryData(["posts", postId], context.previousPostData);
      }
      if (context?.previousAllPostsData) {
        queryClient.setQueryData(["posts"], context.previousAllPostsData);
      }
    },
    onSettled: (data, error, { postId }) => {
      // Always refetch to ensure server state consistency
      queryClient.invalidateQueries({ queryKey: ["posts", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });

      if (!error) {
        // toast.success(data?.message || "Comment updated successfully!");
      }
    },
  });

  return { likeComment, isLikingComment };
};
