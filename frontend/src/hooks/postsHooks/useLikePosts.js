// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import { likePostApi } from "../../api/postsApi";
// import toast from "react-hot-toast";
// import { useAuthUser } from "../authHooks/useAuthUser"; // Assuming this gives you the current user

// export const useLikePost = () => {
//   const queryClient = useQueryClient();
//   const { authUser } = useAuthUser(); // Current authenticated user
  

//   const { mutate: likePost, isPending: isLiking } = useMutation({
//     mutationFn: (postId) => likePostApi(postId),

//     onMutate: async (postId) => {
//       if (!authUser?._id) {
//         console.warn("No authenticated user ID for optimistic post like update.");
//         return;
//       }

//       // 1. Cancel any outgoing refetches for ALL relevant queries
//       await queryClient.cancelQueries({ queryKey: ["posts"] });
//       await queryClient.cancelQueries({ queryKey: ["bookmarkedPosts"] });
//       await queryClient.cancelQueries({ queryKey: ["pinnedPosts", authUser.username] }); // Assuming pinnedPosts is per user
//       await queryClient.cancelQueries({ queryKey: ["post", postId] });

//       // 2. Store previous data for potential rollback
//       const previousPostsData = queryClient.getQueryData(["posts"]);
//       const previousBookmarkedPostsData = queryClient.getQueryData(["bookmarkedPosts"]);
//       const previousPinnedPostsData = queryClient.getQueryData([
//         "pinnedPosts",
//         authUser.username,
//       ]);
//       const previousPostDetailData = queryClient.getQueryData(["post", postId]);

//       // --- OPTIMISTIC UPDATE LOGIC ---

//       // A. OPTIMISTIC UPDATE FOR ALL POSTS LIST (e.g., Feed)
//       queryClient.setQueryData(["posts"], (oldData) => {
//         if (!oldData || !Array.isArray(oldData.pages)) {
//           return oldData;
//         }
//         const newPages = oldData.pages.map((page) => ({
//           ...page,
//           posts: Array.isArray(page.posts)
//             ? page.posts.map((post) => {
//                 const targetPost = post.repostedFrom ? post.repostedFrom : post;
//                 if (targetPost._id === postId) {
//                   const isAlreadyLiked = targetPost.likes?.includes(authUser._id);
//                   return {
//                     ...post,
//                     repostedFrom: post.repostedFrom
//                       ? {
//                           ...targetPost,
//                           likes: isAlreadyLiked
//                             ? (targetPost.likes || []).filter((id) => id !== authUser._id)
//                             : [...(targetPost.likes || []), authUser._id],
//                         }
//                       : {
//                           ...targetPost,
//                           likes: isAlreadyLiked
//                             ? (targetPost.likes || []).filter((id) => id !== authUser._id)
//                             : [...(targetPost.likes || []), authUser._id],
//                         },
//                   };
//                 }
//                 return post;
//               })
//             : page.posts,
//         }));
//         return { ...oldData, pages: newPages };
//       });

//       // B. OPTIMISTIC UPDATE FOR BOOKMARKED POSTS LIST
//       queryClient.setQueryData(["bookmarkedPosts"], (oldData) => {
//         if (!oldData || !Array.isArray(oldData.pages)) {
//           return oldData;
//         }
//         const newPages = oldData.pages.map((page) => ({
//           ...page,
//           posts: Array.isArray(page.posts)
//             ? page.posts.map((post) => {
//                 const targetPost = post.repostedFrom ? post.repostedFrom : post;
//                 if (targetPost._id === postId) {
//                   const isAlreadyLiked = targetPost.likes?.includes(authUser._id);
//                   return {
//                     ...post,
//                     repostedFrom: post.repostedFrom
//                       ? {
//                           ...targetPost,
//                           likes: isAlreadyLiked
//                             ? (targetPost.likes || []).filter((id) => id !== authUser._id)
//                             : [...(targetPost.likes || []), authUser._id],
//                         }
//                       : {
//                           ...targetPost,
//                           likes: isAlreadyLiked
//                             ? (targetPost.likes || []).filter((id) => id !== authUser._id)
//                             : [...(targetPost.likes || []), authUser._id],
//                         },
//                   };
//                 }
//                 return post;
//               })
//             : page.posts,
//         }));
//         return { ...oldData, pages: newPages };
//       });

//       // C. OPTIMISTIC UPDATE FOR PINNED POSTS LIST
//       // Pinned posts might not be paginated, it's typically an array of posts
//       queryClient.setQueryData(["pinnedPosts", authUser.username], (oldData) => {
//         if (!oldData || !Array.isArray(oldData)) {
//           // Assuming pinnedPosts is a direct array of posts
//           return oldData;
//         }
//         return oldData.map((post) => {
//           const targetPost = post.repostedFrom ? post.repostedFrom : post;
//           if (targetPost._id === postId) {
//             const isAlreadyLiked = targetPost.likes?.includes(authUser._id);
//             return {
//               ...post,
//               repostedFrom: post.repostedFrom
//                 ? {
//                     ...targetPost,
//                     likes: isAlreadyLiked
//                       ? (targetPost.likes || []).filter((id) => id !== authUser._id)
//                       : [...(targetPost.likes || []), authUser._id],
//                   }
//                 : {
//                     ...targetPost,
//                     likes: isAlreadyLiked
//                       ? (targetPost.likes || []).filter((id) => id !== authUser._id)
//                       : [...(targetPost.likes || []), authUser._id],
//                   },
//             };
//           }
//           return post;
//         });
//       });

//       // D. OPTIMISTIC UPDATE FOR SINGLE POST DETAIL PAGE
//       queryClient.setQueryData(["post", postId], (oldData) => {
//         if (
//           !oldData ||
//           typeof oldData !== "object" ||
//           Object.keys(oldData).length === 0
//         ) {
//           return oldData;
//         }
//         const targetForLikeUpdate = oldData.repostedFrom || oldData;
//         const isLiked = targetForLikeUpdate.likes?.includes(authUser._id);

//         const newLikes = isLiked
//           ? (targetForLikeUpdate.likes || []).filter((id) => id !== authUser._id)
//           : [...(targetForLikeUpdate.likes || []), authUser._id];

//         const updatedData = oldData.repostedFrom
//           ? { ...oldData, repostedFrom: { ...targetForLikeUpdate, likes: newLikes } }
//           : { ...oldData, likes: newLikes };
//         return updatedData;
//       });

//       // Return the snapshot to the onError callback for rollback
//       return {
//         previousPostsData,
//         previousBookmarkedPostsData,
//         previousPinnedPostsData,
//         previousPostDetailData,
//       };
//     },

//     onSuccess: (data, postId) => {
//       // Invalidate queries to refetch fresh data, ensuring consistency
//       queryClient.invalidateQueries({ queryKey: ["posts"] });
//       queryClient.invalidateQueries({ queryKey: ["bookmarkedPosts"] });
//       queryClient.invalidateQueries({ queryKey: ["pinnedPosts"] }); // Invalidate all pinned posts for simplicity or by user ID
//       queryClient.invalidateQueries({ queryKey: ["post", postId] });
//     },

//     onError: (error, postId, context) => {
//       toast.error(error.message || "Failed to like/unlike post.");
//       // Rollback optimistic updates if the mutation fails
//       if (context?.previousPostsData) {
//         queryClient.setQueryData(["posts"], context.previousPostsData);
//       }
//       if (context?.previousBookmarkedPostsData) {
//         queryClient.setQueryData(
//           ["bookmarkedPosts"],
//           context.previousBookmarkedPostsData
//         );
//       }
//       if (context?.previousPinnedPostsData) {
//         // Need to retrieve username to restore the exact query key
//         // If authUser is available in onError scope, use authUser.username
//         if (authUser?.username) {
//           queryClient.setQueryData(
//             ["pinnedPosts", authUser.username],
//             context.previousPinnedPostsData
//           );
//         } else {
//           // Fallback: if username not available, just invalidate to refetch
//           queryClient.invalidateQueries({ queryKey: ["pinnedPosts"] });
//         }
//       }
//       if (context?.previousPostDetailData) {
//         queryClient.setQueryData(["post", postId], context.previousPostDetailData);
//       }
//     },
//   });

//   return { likePost, isLiking };
// };

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
      if (!authUser?._id) {
        console.warn("No authenticated user ID for optimistic post like update.");
        return;
      }

      const queryKeysToUpdate = [
        ["posts", "/api/posts/all"],
        ["posts", "/api/posts/following"],
        ["bookmarkedPosts"],
        // Add other specific keys as needed, e.g., user profile posts
      ];

      await Promise.all(
        queryKeysToUpdate.map((key) => queryClient.cancelQueries({ queryKey: key }))
      );
      await queryClient.cancelQueries({ queryKey: ["pinnedPosts", authUser.username] });
      await queryClient.cancelQueries({ queryKey: ["post", postId] });

      const previousDataSnapshots = {};
      previousDataSnapshots["posts_all"] = queryClient.getQueryData([
        "posts",
        "/api/posts/all",
      ]);
      previousDataSnapshots["posts_following"] = queryClient.getQueryData([
        "posts",
        "/api/posts/following",
      ]);
      previousDataSnapshots["bookmarkedPosts"] = queryClient.getQueryData([
        "bookmarkedPosts",
      ]);
      previousDataSnapshots["pinnedPosts"] = queryClient.getQueryData([
        "pinnedPosts",
        authUser.username,
      ]);
      previousDataSnapshots["postDetail"] = queryClient.getQueryData(["post", postId]);

      // Helper for updating paginated lists
      const updatePaginatedList = (oldData) => {
        if (!oldData || !Array.isArray(oldData.pages)) {
          return oldData;
        }
        const newPages = oldData.pages.map((page) => ({
          ...page,
          posts: Array.isArray(page.posts)
            ? page.posts.map((post) => {
                // Determine if the current 'post' object itself is the one being liked,
                // or if its 'repostedFrom' property holds the liked post.
                const isTargetOfLike = post._id === postId;
                const isOriginalTargetOfRepost =
                  post.repostedFrom && post.repostedFrom._id === postId;

                if (isTargetOfLike || isOriginalTargetOfRepost) {
                  const targetPostForLikes = isOriginalTargetOfRepost
                    ? post.repostedFrom
                    : post;
                  const isAlreadyLiked = targetPostForLikes.likes?.includes(authUser._id);
                  const newLikes = isAlreadyLiked
                    ? (targetPostForLikes.likes || []).filter((id) => id !== authUser._id)
                    : [...(targetPostForLikes.likes || []), authUser._id];

                  if (isOriginalTargetOfRepost) {
                    // If it's a repost of the liked post, update repostedFrom
                    return {
                      ...post,
                      repostedFrom: {
                        ...targetPostForLikes,
                        likes: newLikes,
                      },
                    };
                  } else {
                    // If it's the original post being liked, update the post directly
                    return {
                      ...post,
                      likes: newLikes,
                    };
                  }
                }
                return post;
              })
            : page.posts,
        }));
        return { ...oldData, pages: newPages };
      };

      // Helper for updating single post arrays (like pinned or single post view)
      const updateSinglePostArray = (oldData) => {
        if (!oldData || !Array.isArray(oldData)) {
          return oldData;
        }
        return oldData.map((post) => {
          const isTargetOfLike = post._id === postId;
          const isOriginalTargetOfRepost =
            post.repostedFrom && post.repostedFrom._id === postId;

          if (isTargetOfLike || isOriginalTargetOfRepost) {
            const targetPostForLikes = isOriginalTargetOfRepost
              ? post.repostedFrom
              : post;
            const isAlreadyLiked = targetPostForLikes.likes?.includes(authUser._id);
            const newLikes = isAlreadyLiked
              ? (targetPostForLikes.likes || []).filter((id) => id !== authUser._id)
              : [...(targetPostForLikes.likes || []), authUser._id];

            if (isOriginalTargetOfRepost) {
              return {
                ...post,
                repostedFrom: {
                  ...targetPostForLikes,
                  likes: newLikes,
                },
              };
            } else {
              return {
                ...post,
                likes: newLikes,
              };
            }
          }
          return post;
        });
      };

      // Helper for updating a single post object (This one was already mostly correct!)
      const updateSinglePostObject = (oldData) => {
        if (
          !oldData ||
          typeof oldData !== "object" ||
          Object.keys(oldData).length === 0
        ) {
          return oldData;
        }
        // If the oldData IS the repostedFrom object (i.e., this is the actual original post in the cache)
        // or if it's the main post object itself (for a non-repost)
        const targetForLikeUpdate =
          oldData.repostedFrom?._id === postId ? oldData.repostedFrom : oldData;

        // Ensure we are only modifying the specific post being liked
        if (targetForLikeUpdate._id !== postId) {
          return oldData; // Not the post we're looking for, return original data
        }

        const isLiked = targetForLikeUpdate.likes?.includes(authUser._id);
        const newLikes = isLiked
          ? (targetForLikeUpdate.likes || []).filter((id) => id !== authUser._id)
          : [...(targetForLikeUpdate.likes || []), authUser._id];

        // If oldData itself is the original post, update it directly
        if (oldData._id === postId) {
          return { ...oldData, likes: newLikes };
        }
        // If oldData is a repost container, update its repostedFrom part
        else if (oldData.repostedFrom && oldData.repostedFrom._id === postId) {
          return {
            ...oldData,
            repostedFrom: { ...oldData.repostedFrom, likes: newLikes },
          };
        }
        return oldData; // Should not happen if the postId check above is robust
      };

      // A. OPTIMISTIC UPDATE FOR ALL MAIN FEEDS (For You, Following)
      queryClient.setQueryData(["posts", "/api/posts/all"], updatePaginatedList);
      queryClient.setQueryData(["posts", "/api/posts/following"], updatePaginatedList);

      // B. OPTIMISTIC UPDATE FOR BOOKMARKED POSTS LIST
      queryClient.setQueryData(["bookmarkedPosts"], updatePaginatedList);

      // C. OPTIMISTIC UPDATE FOR PINNED POSTS LIST
      queryClient.setQueryData(["pinnedPosts", authUser.username], updateSinglePostArray);

      // D. OPTIMISTIC UPDATE FOR SINGLE POST DETAIL PAGE
      // For the single post detail page, the 'oldData' passed to updateSinglePostObject
      // will already be the 'post' object itself, not a wrapper.
      queryClient.setQueryData(["post", postId], updateSinglePostObject);

      return previousDataSnapshots;
    },

    onSuccess: (data, postId) => {
      // Invalidate queries to refetch fresh data, ensuring consistency
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarkedPosts"] });
      queryClient.invalidateQueries({ queryKey: ["pinnedPosts"] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
    },

    onError: (error, postId, context) => {
      toast.error(error.message || "Failed to like/unlike post.");
      if (context?.previousDataSnapshots) {
        queryClient.setQueryData(
          ["posts", "/api/posts/all"],
          context.previousDataSnapshots["posts_all"]
        );
        queryClient.setQueryData(
          ["posts", "/api/posts/following"],
          context.previousDataSnapshots["posts_following"]
        );
        queryClient.setQueryData(
          ["bookmarkedPosts"],
          context.previousDataSnapshots["bookmarkedPosts"]
        );

        if (authUser?.username) {
          queryClient.setQueryData(
            ["pinnedPosts", authUser.username],
            context.previousDataSnapshots["pinnedPosts"]
          );
        } else {
          queryClient.invalidateQueries({ queryKey: ["pinnedPosts"] });
        }
        queryClient.setQueryData(
          ["post", postId],
          context.previousDataSnapshots["postDetail"]
        );
      }
    },
  });

  return { likePost, isLiking };
};
