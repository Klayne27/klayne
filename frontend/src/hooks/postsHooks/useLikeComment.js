// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import toast from "react-hot-toast";
// import { likeUnlikeCommentApi } from "../../api/postsApi";
// import { useAuthUser } from "../authHooks/useAuthUser";

// export const useLikeComment = () => {
//   const queryClient = useQueryClient();
//   const { authUser } = useAuthUser();

//   const { mutate: likeComment, isPending: isLikingComment } = useMutation({
//     mutationFn: ({ postId, commentId }) => likeUnlikeCommentApi(postId, commentId),
//     onMutate: async ({ postId, commentId }) => {
//       if (!authUser?._id) {
//         console.warn("authUser not available for optimistic comment like update.");
//         return;
//       }

//       await queryClient.cancelQueries({ queryKey: ["posts", postId] });
//       await queryClient.cancelQueries({ queryKey: ["posts"] });

//       const previousPostData = queryClient.getQueryData(["posts", postId]);
//       const previousAllPostsData = queryClient.getQueryData(["posts"]);

//       queryClient.setQueryData(["posts", postId], (oldPost) => {
//         if (!oldPost || !oldPost.comments) return oldPost;

//         const updatedComments = oldPost.comments.map((comment) => {
//           if (comment._id === commentId) {
//             const isCurrentlyLiked = comment.likes?.includes(authUser._id);
//             return {
//               ...comment,
//               likes: isCurrentlyLiked
//                 ? (comment.likes || []).filter((id) => id !== authUser._id)
//                 : [...(comment.likes || []), authUser._id],
//             };
//           }
//           return comment;
//         });

//         return {
//           ...oldPost,
//           comments: updatedComments,
//         };
//       });

//       queryClient.setQueryData(["posts"], (oldData) => {
//         if (!oldData || !Array.isArray(oldData.pages)) return oldData;

//         return {
//           ...oldData,
//           pages: oldData.pages.map((page) => ({
//             ...page,
//             posts: Array.isArray(page.posts)
//               ? page.posts.map((postItem) => {
//                   if (postItem._id === postId) {
//                     const updatedComments = postItem.comments.map((comment) => {
//                       if (comment._id === commentId) {
//                         const isCurrentlyLiked = comment.likes?.includes(authUser._id);
//                         return {
//                           ...comment,
//                           likes: isCurrentlyLiked
//                             ? (comment.likes || []).filter((id) => id !== authUser._id)
//                             : [...(comment.likes || []), authUser._id],
//                         };
//                       }
//                       return comment;
//                     });
//                     return { ...postItem, comments: updatedComments };
//                   }
//                   return postItem;
//                 })
//               : page.posts,
//           })),
//         };
//       });

//       return { previousPostData, previousAllPostsData };
//     },
//     onError: (error, { postId }, context) => {
//       showAppToast(error.message|| "Failed to like/unlike comment.");
//       console.error("Comment like mutation failed for postId:", postId, error);

//       if (context?.previousPostData) {
//         queryClient.setQueryData(["posts", postId], context.previousPostData);
//       }
//       if (context?.previousAllPostsData) {
//         queryClient.setQueryData(["posts"], context.previousAllPostsData);
//       }
//     },
//     onSettled: (data, error, { postId }) => {
//       queryClient.invalidateQueries({ queryKey: ["posts", postId] });
//       queryClient.invalidateQueries({ queryKey: ["posts"] });
//     },
//   });

//   return { likeComment, isLikingComment };
// };
