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
import { useParams } from "react-router-dom"; // Import useParams to get username/userId from URL
import { useFetchUserProfile } from "../usersHooks/useFetchUserProfile";

export const useLikePost = () => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();
  const { username } = useParams(); // Get username and potentially userId from URL params

  const { user } = useFetchUserProfile(username)

  const { mutate: likePost, isPending: isLiking } = useMutation({
    mutationFn: (postId) => likePostApi(postId),

    onMutate: async (postId) => {
      if (!authUser?._id) {
        console.warn("No authenticated user ID for optimistic post like update.");
        return;
      }

      // Dynamically determine all potential query keys where this post might exist.
      // This is crucial for comprehensive optimistic updates.
      const dynamicUserPostsKey = username
        ? ["posts", `/api/posts/user/${username}`]
        : null;
      const dynamicUserLikesKey = user?._id
        ? ["posts", `/api/posts/likes/${user?._id}`]
        : null;

      const queryKeysToUpdate = [
        ["posts", "/api/posts/all"],
        ["posts", "/api/posts/following"],
        ["bookmarkedPosts"], // This key is fine as it is

        // Add the dynamic profile page keys if they are currently active or might contain the post
        ...(dynamicUserPostsKey ? [dynamicUserPostsKey] : []),
        ...(dynamicUserLikesKey ? [dynamicUserLikesKey] : []),
      ].filter(Boolean); // Filter out any null entries

      // Cancel all relevant queries
      await Promise.all(
        queryKeysToUpdate.map((key) => queryClient.cancelQueries({ queryKey: key }))
      );
      // Note: "pinnedPosts" query key is ["pinnedPosts", authUser.username]
      await queryClient.cancelQueries({ queryKey: ["pinnedPosts", authUser.username] });
      // Note: Single post query key is ["post", postId]
      await queryClient.cancelQueries({ queryKey: ["post", postId] });

      // 2. Store previous data for potential rollback for ALL potentially affected queries
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

      // Add dynamic profile page query data to snapshots
      if (dynamicUserPostsKey) {
        previousDataSnapshots["posts_user"] =
          queryClient.getQueryData(dynamicUserPostsKey);
      }
      if (dynamicUserLikesKey) {
        previousDataSnapshots["posts_likes"] =
          queryClient.getQueryData(dynamicUserLikesKey);
      }

      // Helper for updating paginated lists (remains the same as our last good version)
      const updatePaginatedList = (oldData) => {
        if (!oldData || !Array.isArray(oldData.pages)) {
          return oldData;
        }
        const newPages = oldData.pages.map((page) => ({
          ...page,
          posts: Array.isArray(page.posts)
            ? page.posts.map((post) => {
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
              })
            : page.posts,
        }));
        return { ...oldData, pages: newPages };
      };

      // Helper for updating single post arrays (like pinned) (remains the same)
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

      // Helper for updating a single post object (remains the same)
      const updateSinglePostObject = (oldData) => {
        if (
          !oldData ||
          typeof oldData !== "object" ||
          Object.keys(oldData).length === 0
        ) {
          return oldData;
        }
        const targetForLikeUpdate =
          oldData.repostedFrom?._id === postId ? oldData.repostedFrom : oldData;

        if (targetForLikeUpdate._id !== postId) {
          return oldData;
        }

        const isLiked = targetForLikeUpdate.likes?.includes(authUser._id);
        const newLikes = isLiked
          ? (targetForLikeUpdate.likes || []).filter((id) => id !== authUser._id)
          : [...(targetForLikeUpdate.likes || []), authUser._id];

        if (oldData._id === postId) {
          return { ...oldData, likes: newLikes };
        } else if (oldData.repostedFrom && oldData.repostedFrom._id === postId) {
          return {
            ...oldData,
            repostedFrom: { ...oldData.repostedFrom, likes: newLikes },
          };
        }
        return oldData;
      };

      // A. OPTIMISTIC UPDATE FOR ALL MAIN FEEDS (For You, Following)
      queryClient.setQueryData(["posts", "/api/posts/all"], updatePaginatedList);
      queryClient.setQueryData(["posts", "/api/posts/following"], updatePaginatedList);

      // B. OPTIMISTIC UPDATE FOR BOOKMARKED POSTS LIST
      queryClient.setQueryData(["bookmarkedPosts"], updatePaginatedList);

      // C. OPTIMISTIC UPDATE FOR PINNED POSTS LIST (Still assuming this is a single array of posts)
      queryClient.setQueryData(["pinnedPosts", authUser.username], updateSinglePostArray);

      // D. OPTIMISTIC UPDATE FOR SINGLE POST DETAIL PAGE
      queryClient.setQueryData(["post", postId], updateSinglePostObject);

      // NEW: E. OPTIMISTIC UPDATE FOR USER PROFILE FEEDS
      if (dynamicUserPostsKey) {
        queryClient.setQueryData(dynamicUserPostsKey, updatePaginatedList);
      }
      if (dynamicUserLikesKey) {
        queryClient.setQueryData(dynamicUserLikesKey, updatePaginatedList);
      }

      return previousDataSnapshots;
    },

    onSuccess: (data, postId) => {
      // Invalidate all general "posts" keys (will include user profile specific feeds)
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarkedPosts"] });
      // No need to invalidate pinnedPosts here, as its content itself doesn't change on a like,
      // only its internal post's like count, which was handled optimistically.
      // queryClient.invalidateQueries({ queryKey: ["pinnedPosts"] }); // REMOVED

      queryClient.invalidateQueries({ queryKey: ["post", postId] });
    },

    onError: (error, postId, context) => {
      toast.error(error.message || "Failed to like/unlike post.");
      if (context?.previousDataSnapshots) {
        // Rollback all known general "posts" keys
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

        // Rollback dynamic profile page query data
        if (context.previousDataSnapshots["posts_user"]) {
          queryClient.setQueryData(
            ["posts", `/api/posts/user/${username}`],
            context.previousDataSnapshots["posts_user"]
          );
        }
        if (context.previousDataSnapshots["posts_likes"]) {
          queryClient.setQueryData(
            ["posts", `/api/posts/likes/${user?._id}`],
            context.previousDataSnapshots["posts_likes"]
          );
        }

        // Rollback pinned posts
        if (authUser?.username) {
          queryClient.setQueryData(
            ["pinnedPosts", authUser.username],
            context.previousDataSnapshots["pinnedPosts"]
          );
        } else {
          // If authUser.username is not available for some reason, invalidate as a fallback
          queryClient.invalidateQueries({ queryKey: ["pinnedPosts"] });
        }
        // Rollback single post detail page
        queryClient.setQueryData(
          ["post", postId],
          context.previousDataSnapshots["postDetail"]
        );
      }
    },
  });

  return { likePost, isLiking };
};