import { useMutation, useQueryClient } from "@tanstack/react-query";
import { likePostApi } from "../../api/postsApi";
import toast from "react-hot-toast";
import { useAuthUser } from "../authHooks/useAuthUser"; // Assuming this gives you the current user

export const useLikePost = () => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser(); // Current authenticated user

  const { mutate: likePost, isPending: isLiking } = useMutation({
    mutationFn: (postId) => likePostApi(postId),

    onMutate: async (postId) => {
      if (!authUser?._id) {
        console.warn("No authenticated user ID for optimistic post like update.");
        return;
      }

      // 1. Cancel any outgoing refetches for ALL relevant queries
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      await queryClient.cancelQueries({ queryKey: ["bookmarkedPosts"] });
      await queryClient.cancelQueries({ queryKey: ["pinnedPosts", authUser.username] }); // Assuming pinnedPosts is per user
      await queryClient.cancelQueries({ queryKey: ["post", postId] });

      // 2. Store previous data for potential rollback
      const previousPostsData = queryClient.getQueryData(["posts"]);
      const previousBookmarkedPostsData = queryClient.getQueryData(["bookmarkedPosts"]);
      const previousPinnedPostsData = queryClient.getQueryData([
        "pinnedPosts",
        authUser.username,
      ]);
      const previousPostDetailData = queryClient.getQueryData(["post", postId]);

      // --- OPTIMISTIC UPDATE LOGIC ---

      // A. OPTIMISTIC UPDATE FOR ALL POSTS LIST (e.g., Feed)
      queryClient.setQueryData(["posts"], (oldData) => {
        if (!oldData || !Array.isArray(oldData.pages)) {
          return oldData;
        }
        const newPages = oldData.pages.map((page) => ({
          ...page,
          posts: Array.isArray(page.posts)
            ? page.posts.map((post) => {
                const targetPost = post.repostedFrom ? post.repostedFrom : post;
                if (targetPost._id === postId) {
                  const isAlreadyLiked = targetPost.likes?.includes(authUser._id);
                  return {
                    ...post,
                    repostedFrom: post.repostedFrom
                      ? {
                          ...targetPost,
                          likes: isAlreadyLiked
                            ? (targetPost.likes || []).filter((id) => id !== authUser._id)
                            : [...(targetPost.likes || []), authUser._id],
                        }
                      : {
                          ...targetPost,
                          likes: isAlreadyLiked
                            ? (targetPost.likes || []).filter((id) => id !== authUser._id)
                            : [...(targetPost.likes || []), authUser._id],
                        },
                  };
                }
                return post;
              })
            : page.posts,
        }));
        return { ...oldData, pages: newPages };
      });

      // B. OPTIMISTIC UPDATE FOR BOOKMARKED POSTS LIST
      queryClient.setQueryData(["bookmarkedPosts"], (oldData) => {
        if (!oldData || !Array.isArray(oldData.pages)) {
          return oldData;
        }
        const newPages = oldData.pages.map((page) => ({
          ...page,
          posts: Array.isArray(page.posts)
            ? page.posts.map((post) => {
                const targetPost = post.repostedFrom ? post.repostedFrom : post;
                if (targetPost._id === postId) {
                  const isAlreadyLiked = targetPost.likes?.includes(authUser._id);
                  return {
                    ...post,
                    repostedFrom: post.repostedFrom
                      ? {
                          ...targetPost,
                          likes: isAlreadyLiked
                            ? (targetPost.likes || []).filter((id) => id !== authUser._id)
                            : [...(targetPost.likes || []), authUser._id],
                        }
                      : {
                          ...targetPost,
                          likes: isAlreadyLiked
                            ? (targetPost.likes || []).filter((id) => id !== authUser._id)
                            : [...(targetPost.likes || []), authUser._id],
                        },
                  };
                }
                return post;
              })
            : page.posts,
        }));
        return { ...oldData, pages: newPages };
      });

      // C. OPTIMISTIC UPDATE FOR PINNED POSTS LIST
      // Pinned posts might not be paginated, it's typically an array of posts
      queryClient.setQueryData(["pinnedPosts", authUser.username], (oldData) => {
        if (!oldData || !Array.isArray(oldData)) {
          // Assuming pinnedPosts is a direct array of posts
          return oldData;
        }
        return oldData.map((post) => {
          const targetPost = post.repostedFrom ? post.repostedFrom : post;
          if (targetPost._id === postId) {
            const isAlreadyLiked = targetPost.likes?.includes(authUser._id);
            return {
              ...post,
              repostedFrom: post.repostedFrom
                ? {
                    ...targetPost,
                    likes: isAlreadyLiked
                      ? (targetPost.likes || []).filter((id) => id !== authUser._id)
                      : [...(targetPost.likes || []), authUser._id],
                  }
                : {
                    ...targetPost,
                    likes: isAlreadyLiked
                      ? (targetPost.likes || []).filter((id) => id !== authUser._id)
                      : [...(targetPost.likes || []), authUser._id],
                  },
            };
          }
          return post;
        });
      });

      // D. OPTIMISTIC UPDATE FOR SINGLE POST DETAIL PAGE
      queryClient.setQueryData(["post", postId], (oldData) => {
        if (
          !oldData ||
          typeof oldData !== "object" ||
          Object.keys(oldData).length === 0
        ) {
          return oldData;
        }
        const targetForLikeUpdate = oldData.repostedFrom || oldData;
        const isLiked = targetForLikeUpdate.likes?.includes(authUser._id);

        const newLikes = isLiked
          ? (targetForLikeUpdate.likes || []).filter((id) => id !== authUser._id)
          : [...(targetForLikeUpdate.likes || []), authUser._id];

        const updatedData = oldData.repostedFrom
          ? { ...oldData, repostedFrom: { ...targetForLikeUpdate, likes: newLikes } }
          : { ...oldData, likes: newLikes };
        return updatedData;
      });

      // Return the snapshot to the onError callback for rollback
      return {
        previousPostsData,
        previousBookmarkedPostsData,
        previousPinnedPostsData,
        previousPostDetailData,
      };
    },

    onSuccess: (data, postId) => {
      // Invalidate queries to refetch fresh data, ensuring consistency
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarkedPosts"] });
      queryClient.invalidateQueries({ queryKey: ["pinnedPosts"] }); // Invalidate all pinned posts for simplicity or by user ID
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
    },

    onError: (error, postId, context) => {
      toast.error(error.message || "Failed to like/unlike post.");
      // Rollback optimistic updates if the mutation fails
      if (context?.previousPostsData) {
        queryClient.setQueryData(["posts"], context.previousPostsData);
      }
      if (context?.previousBookmarkedPostsData) {
        queryClient.setQueryData(
          ["bookmarkedPosts"],
          context.previousBookmarkedPostsData
        );
      }
      if (context?.previousPinnedPostsData) {
        // Need to retrieve username to restore the exact query key
        // If authUser is available in onError scope, use authUser.username
        if (authUser?.username) {
          queryClient.setQueryData(
            ["pinnedPosts", authUser.username],
            context.previousPinnedPostsData
          );
        } else {
          // Fallback: if username not available, just invalidate to refetch
          queryClient.invalidateQueries({ queryKey: ["pinnedPosts"] });
        }
      }
      if (context?.previousPostDetailData) {
        queryClient.setQueryData(["post", postId], context.previousPostDetailData);
      }
    },
  });

  return { likePost, isLiking };
};
