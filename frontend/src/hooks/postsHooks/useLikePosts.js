import { useMutation, useQueryClient } from "@tanstack/react-query";
import { likePostApi } from "../../api/postsApi";
import toast from "react-hot-toast";
import { useAuthUser } from "../authHooks/useAuthUser";

export const useLikePost = () => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

  const { mutate: likePost, isPending: isLiking } = useMutation({
    mutationFn: (postId) => likePostApi(postId),

    onMutate: async (postId) => {
      console.log("authUser._id: ", authUser._id);
      if (!authUser?._id) {
        console.warn("No authenticated user ID for optimistic post like update.");
        return;
      }

      // Cancel any outgoing refetches for all posts and the specific single post
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      // CORRECTED: Use ["post", postId] for single post query key
      await queryClient.cancelQueries({ queryKey: ["post", postId] });

      // Store previous data for potential rollback
      const previousPostsData = queryClient.getQueryData(["posts"]);
      // CORRECTED: Use ["post", postId] for single post query key
      const previousPostDetailData = queryClient.getQueryData(["post", postId]);

      // Log current cache state to debug if data is present
      console.log('Current cache for "posts":', previousPostsData);
      console.log('Current cache for "post", postId:', previousPostDetailData);

      // OPTIMISTIC UPDATE FOR ALL POSTS LIST (e.g., Feed)
      queryClient.setQueryData(["posts"], (oldData) => {
        console.log('oldData inside setQueryData for "posts":', oldData);
        if (!oldData || !Array.isArray(oldData.pages)) {
          console.warn(
            "Optimistic update for 'posts' skipped: oldData is invalid or undefined."
          );
          return oldData;
        }

        const newPages = oldData.pages.map((page) => ({
          ...page,
          posts: Array.isArray(page.posts)
            ? page.posts.map((post) => {
                // Ensure it's the original post being liked if it's a repost
                const targetPost = post.repostedFrom ? post.repostedFrom : post;
                if (targetPost._id === postId) {
                  const isAlreadyLiked = targetPost.likes?.includes(authUser._id);
                  return {
                    ...post, // Keep the outer post structure if it's a repost
                    repostedFrom: post.repostedFrom
                      ? {
                          ...targetPost,
                          likes: isAlreadyLiked
                            ? (targetPost.likes || []).filter((id) => id !== authUser._id)
                            : [...(targetPost.likes || []), authUser._id],
                        }
                      : {
                          // If it's not a repost, update the post itself
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
        console.log('Updated "posts" data:', { ...oldData, pages: newPages });
        return { ...oldData, pages: newPages };
      });

      // OPTIMISTIC UPDATE FOR SINGLE POST DETAIL PAGE
      // CORRECTED: Use ["post", postId] for single post query key
      queryClient.setQueryData(["post", postId], (oldData) => {
        console.log('oldData inside setQueryData for ["post", postId]:', oldData);
        if (
          !oldData ||
          typeof oldData !== "object" ||
          Object.keys(oldData).length === 0
        ) {
          // More robust check
          console.warn(
            "Optimistic update for single 'post' skipped: oldData is not a valid object or undefined."
          );
          return oldData;
        }
        // When dealing with a single post, it might be the original post or a reposted one.
        // You need to ensure you're updating the 'likes' array on the *originalPost* data
        // which your Post component is consuming.
        // Assuming `oldData` here is the *originalPost* object itself (as fetched by useFetchPost)
        // If oldData can be a "reposted" post object (i.e. oldData.repostedFrom exists),
        // you'd need to update oldData.repostedFrom.likes.
        // Based on useFetchPost, it seems to fetch the original post directly if pid is the original post's ID.
        // Let's assume oldData *is* the original post or the main post being displayed.
        const targetForLikeUpdate = oldData.repostedFrom || oldData; // Use repostedFrom if it exists, otherwise oldData itself
        const isLiked = targetForLikeUpdate.likes?.includes(authUser._id);

        const newLikes = isLiked
          ? (targetForLikeUpdate.likes || []).filter((id) => id !== authUser._id)
          : [...(targetForLikeUpdate.likes || []), authUser._id];

        // Construct the updated object
        const updatedData = oldData.repostedFrom
          ? {
              ...oldData,
              repostedFrom: {
                ...targetForLikeUpdate,
                likes: newLikes,
              },
            }
          : {
              ...oldData,
              likes: newLikes,
            };

        console.log('Updated single "post" data:', updatedData);
        return updatedData;
      });

      // Return the snapshot to the onError callback for rollback
      return { previousPostsData, previousPostDetailData };
    },

    onSuccess: (data, postId) => {
      // Invalidate queries to refetch fresh data, ensuring consistency
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      // CORRECTED: Invalidate the specific single post query key, which is more precise
      // than invalidating all ["post"] queries. You can keep the general ["post"] if you want
      // to be absolutely sure all single post instances are refetched.
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      // If you are on a post detail page, this also triggers a refetch of that specific post.
      // If you want all cached single posts to refetch, you could also add:
      // queryClient.invalidateQueries({ queryKey: ["post"] });
    },

    onError: (error, postId, context) => {
      toast.error(error.message || "Failed to like/unlike post.");
      // Rollback optimistic updates if the mutation fails
      if (context?.previousPostsData) {
        queryClient.setQueryData(["posts"], context.previousPostsData);
      }
      if (context?.previousPostDetailData) {
        // CORRECTED: Use ["post", postId] for single post query key
        queryClient.setQueryData(["post", postId], context.previousPostDetailData);
      }
    },
  });

  return { likePost, isLiking };
};
