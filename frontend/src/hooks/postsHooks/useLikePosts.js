import { useMutation, useQueryClient } from "@tanstack/react-query";
import { likePostApi } from "../../api/postsApi"; // Assuming this path is correct
import { useAuthUser } from "../authHooks/useAuthUser"; // Assuming this path is correct


export const useLikePost = (username = null, userProfileId = null) => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();


  const { mutate: likePost, isPending: isLiking } = useMutation({
    mutationFn: (postId) => likePostApi(postId),

    onMutate: async (postId) => {
      if (!authUser?._id) {
        console.warn("No authenticated user ID for optimistic post like update.");
        return;
      }

      // 1. Adjust dynamicUserPostsKey to use `currentProfileUsername`
      const dynamicUserPostsKey = username
        ? ["posts", `/api/posts/user/${username}`]
        : null;

      // 2. Adjust dynamicUserLikesKey to always use `authUser._id`
      // This key is for the current authenticated user's "liked posts" feed, not the profile being viewed.
      const dynamicUserLikesKey = userProfileId
        ? ["posts", `/api/posts/likes/${userProfileId}`]
        : null;

      const queryKeysToUpdate = [
        ["posts", "/api/posts/all"],
        ["posts", "/api/posts/following"],
        ["bookmarkedPosts"],

        // Add the dynamic profile page keys if they are currently active or might contain the post
        ...(dynamicUserPostsKey ? [dynamicUserPostsKey] : []),
        ...(dynamicUserLikesKey ? [dynamicUserLikesKey] : []), // This will be ["posts", "/api/posts/likes/undefined"] if authUser._id is missing, but should be fine since useAuthUser should ensure it
      ].filter(Boolean);

      // Cancel all relevant queries
      await Promise.all(
        queryKeysToUpdate.map((key) => queryClient.cancelQueries({ queryKey: key }))
      );
      // Ensure authUser.username is valid before cancelling this specific query
      if (authUser?.username) {
        await queryClient.cancelQueries({ queryKey: ["pinnedPosts", username] });
      }
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
      // Ensure authUser.username is valid before getting this query data
      if (authUser?.username) {
        previousDataSnapshots["pinnedPosts"] = queryClient.getQueryData([
          "pinnedPosts",
          username,
        ]);
      }
      previousDataSnapshots["postDetail"] = queryClient.getQueryData(["post", postId]);

      // Add dynamic profile page query data to snapshots
      if (dynamicUserPostsKey) {
        // This condition implicitly checks if currentProfileUsername exists
        previousDataSnapshots["posts_user"] =
          queryClient.getQueryData(dynamicUserPostsKey);
      }
      if (dynamicUserLikesKey) {
        // This condition implicitly checks if authUser._id exists
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
                  const isAlreadyLiked = targetPostForLikes.likes?.includes(authUser?._id);
                  const newLikes = isAlreadyLiked
                    ? (targetPostForLikes.likes || []).filter((id) => id !== authUser?._id)
                    : [...(targetPostForLikes.likes || []), authUser?._id];

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

        const isLiked = targetForLikeUpdate.likes?.includes(authUser?._id);
        const newLikes = isLiked
          ? (targetForLikeUpdate.likes || []).filter((id) => id !== authUser?._id)
          : [...(targetForLikeUpdate.likes || []), authUser?._id];

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

      // C. OPTIMISTIC UPDATE FOR PINNED POSTS LIST
      if (username) {
        // Only update if authUser.username is available
        queryClient.setQueryData(
          ["pinnedPosts", username],
          updateSinglePostArray
        );
      }

      // D. OPTIMISTIC UPDATE FOR SINGLE POST DETAIL PAGE
      queryClient.setQueryData(["post", postId], updateSinglePostObject);

      // E. OPTIMISTIC UPDATE FOR USER PROFILE FEEDS
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
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      // No need to invalidate pinnedPosts here explicitly, as it's part of general 'posts' invalidation or its data object is updated optimistically.
      // If `pinnedPosts` query is scoped by username, ensure `authUser.username` is used for invalidation if needed:
      // if (authUser?.username) {
      //   queryClient.invalidateQueries({ queryKey: ["pinnedPosts", authUser.username] });
      // }
    },

    onError: (error, postId, context) => {
      // showAppToast(error.message|| "Failed to like/unlike post.");
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

        // Rollback dynamic profile page query data using `currentProfileUsername`
        if (context.previousDataSnapshots["posts_user"] && username) {
          queryClient.setQueryData(
            ["posts", `/api/posts/user/${username}`],
            context.previousDataSnapshots["posts_user"]
          );
        }
        // Rollback dynamic likes key using `authUser._id`
        if (context.previousDataSnapshots["posts_likes"] && userProfileId) {
          queryClient.setQueryData(
            ["posts", `/api/posts/likes/${userProfileId}`],
            context.previousDataSnapshots["posts_likes"]
          );
        }

        // Rollback pinned posts
        if (username && context.previousDataSnapshots["pinnedPosts"]) {
          queryClient.setQueryData(
            ["pinnedPosts", username],
            context.previousDataSnapshots["pinnedPosts"]
          );
        } else if (username) {
          // Fallback if snapshot wasn't taken (e.g., if authUser.username was missing during mutate)
          queryClient.invalidateQueries({ queryKey: ["pinnedPosts", username] });
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
