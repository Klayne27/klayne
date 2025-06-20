import { useMutation, useQueryClient } from "@tanstack/react-query";
import { likePostApi } from "../../api/postsApi";
import toast from "react-hot-toast";
import { useAuthUser } from "../authHooks/useAuthUser";

export const useLikePost = (post) => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser(); // Get the current authenticated user

  const { mutate: likePost, isPending: isLiking } = useMutation({
    mutationFn: () => likePostApi(post),
    onMutate: async (postId) => {
      // 1. Cancel any outgoing refetches for this query to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      await queryClient.cancelQueries({ queryKey: ["posts", postId] }); // For single post view

      // 2. Snapshot the current cached data
      const previousPostsData = queryClient.getQueryData(["posts"]);
      const previousPostDetailData = queryClient.getQueryData(["posts", postId]);

      // 3. Optimistically update the 'posts' list (e.g., from useInfiniteQuery)
      queryClient.setQueryData(["posts"], (oldData) => {
        // Essential: Check if oldData or its 'pages' property exists and is an array
        if (!oldData || !Array.isArray(oldData.pages)) {
          // If no data in cache, or unexpected format, return it as is or a default structure
          return oldData;
        }

        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            posts: Array.isArray(page.posts) // Essential: Check if page.posts is an array
              ? page.posts.map((post) => {
                  if (post._id === postId) {
                    const isLiked = post.likes?.includes(authUser?._id); // Safety: post.likes?.
                    return {
                      ...post,
                      likes: isLiked
                        ? (post.likes || []).filter((id) => id !== authUser?._id) // Filter from existing array
                        : [...(post.likes || []), authUser?._id], // Add to existing array
                    };
                  }
                  return post;
                })
              : page.posts, // If not an array, return as is
          })),
        };
      });

      queryClient.setQueryData(["posts", postId], (oldData) => {
        // Essential: Check if oldData exists
        if (!oldData) {
          return oldData;
        }
        const isLiked = oldData.likes?.includes(authUser?._id); // Safety: oldData.likes?.
        return {
          ...oldData,
          likes: isLiked
            ? (oldData.likes || []).filter((id) => id !== authUser?._id)
            : [...(oldData.likes || []), authUser?._id],
        };
      });

      // Return context for potential rollback in onError
      return { previousPostsData, previousPostDetailData };
    },

    onSuccess: (data, postId) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post"] });
      queryClient.invalidateQueries({ queryKey: ["posts", postId] });
    },

    onError: (error, postId, context) => {
      toast.error(error.message || "Failed to like/unlike post.");
      // Rollback optimistic updates on error
      if (context?.previousPostsData) {
        queryClient.setQueryData(["posts"], context.previousPostsData);
      }
      if (context?.previousPostDetailData) {
        queryClient.setQueryData(["posts", postId], context.previousPostDetailData);
      }
    },
  });

  return { likePost, isLiking };
};
